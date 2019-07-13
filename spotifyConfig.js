//Load Spotify Node SDK
const CONSTANTS = require('./constants');
const SpotifyWebApi = require('spotify-web-api-node');
//Cron module for scheduling refresh
var schedule = require('node-schedule');
const moment = require('moment');
const slack = require('./slackController');

// Setting credentials can be done in the wrapper's constructor, or using the API object's setters.
var spotifyApi = new SpotifyWebApi({
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});

const DEFAULT_DEVICE_ID = '6d2e33d004c05821b7be5da785dbc3a2c55eeca7';
const loki = require('lokijs');
var db = new loki(CONSTANTS.CONFIG_FILE, {
    autoload: true,
    autoloadCallback: initialise,
    autosave: true
});


/**
 * Initialise/load the persistant lokijs database, start up CRON jobs.
 */
function initialise() {
    var configs = db.getCollection(CONSTANTS.CONFIG);
    // If collection is empty do not load it, instead - create a new file
    if (configs === null || configs.count() == 0) {
        configs = db.addCollection(CONSTANTS.CONFIG);
        return;
    }
    console.log("Old Auth Loaded");
    if (isAuthExpired()) {
        console.log("Need to get a new access token");
        return;
    }
    // Re-configure the Spotify Api
    var auth = configs.findOne({ name: CONSTANTS.AUTH });
    spotifyApi.setAccessToken(auth.access_token);
    spotifyApi.setRefreshToken(auth.refresh_token);
    setRefreshTokenCronJobs();
}

/**
 * First time setup
 * @param {Slack Id} user_id 
 * @param {Slack Post Trigger Id} trigger_id 
 * @param {Slack Response URL} response_url 
 */
function setup(user_id, trigger_id, response_url){
    var configs = db.getCollection(CONSTANTS.CONFIG);
    var admins = configs.findOne( { name : CONSTANTS.ADMIN });
    var auth = configs.findOne( { name : CONSTANTS.AUTH });
    // Assign user as admin.
    if (admins == null){
        console.log("Adding admin");
        configs.insert({
            name: CONSTANTS.ADMIN,
            users: [user_id]
        });
        slack.send("ephemeral","You have been added as the admin of Spotbot", response_url);
    }
    // Start Spotify Auth
    if (auth == null){
        console.log("Adding auth");
        return(authenticate(trigger_id, response_url));
    }
    console.log("no action");
}

// ------------------------
// Auth Functions
// ------------------------
/**
 * Returns a Spotify authorisation URL
 * @param {Slack trigger id} trigger_id 
 * @param {Slack response url} response_url 
 */
function authenticate(trigger_id, response_url){
    var configs = db.getCollection(CONSTANTS.CONFIG);
    var auth = configs.findOne( { name : CONSTANTS.AUTH });
    var thirty = moment().add(30, 'm');
    // If previously exists:
    if (auth != null){
        auth.trigger_id = trigger_id;
        auth.trigger_expires = thirty
        auth.response_url = response_url
        configs.update(auth);
    }
    // If not create one:
    else{
        configs.insert({
            name: CONSTANTS.AUTH,
            trigger_id: trigger_id,
            trigger_expires: thirty,
            response_url: response_url
        });
    }

    // Create the authorization URL
    var authorizeURL = spotifyApi.createAuthorizeURL(CONSTANTS.SCOPES, trigger_id);
    return slack.reply("ephemeral", "Please visit the following link to authenticate your Spotify account. You have 30 minutes to authenticate.", [{
        fallback: "Please visit the following link to authenticate your Spotify account: " + authorizeURL,
        actions: [
            {
                "type": "button",
                "style": "primary",
                "text": ":link: Authenticate with Spotify",
                "url": authorizeURL
            }
        ]
    }]);
}

/**
 * Get Access and Refresh Token from Spotify.
 * @param {String} code Code passed from Spotify Authorization Code Flow 
 */
async function getAccessToken(code, state) {
    try {
        var configs = db.getCollection(CONSTANTS.CONFIG);
        var auth = configs.findOne({
            name: CONSTANTS.AUTH
        });
        if (auth.trigger_id != state){
            return ("Invalid State, Please re-authenticate again");
        }
        else if (moment().isAfter(auth.trigger_expires)){
            console.log(moment().format());
            console.log(auth.trigger_expires.format());
            return ("Your authentication window has expired. Please re-authenticate again");
        }
        else{
            let getAccess = await (spotifyApi.authorizationCodeGrant(code))
            console.log('The token expires in ' + getAccess.body['expires_in']);
            console.log('The access token is ' + getAccess.body['access_token']);
            console.log('The refresh token is ' + getAccess.body['refresh_token']);
            spotifyApi.setAccessToken(getAccess.body['access_token']);
            spotifyApi.setRefreshToken(getAccess.body['refresh_token']);
            //Save config in our db
            updateAccess();
            setRefreshTokenCronJobs();
            var auth = configs.findOne({
                name: CONSTANTS.AUTH
            });
            // Get Spotify ID (For playlist addition later)
            let profile = await spotifyApi.getMe();
            auth.id = profile.body.id;
            configs.update(auth);
            slack.send("ephemeral","Successfully authenticated :white_check_mark:", auth.response_url);
            return "<script> window.close(); </script>";
        }
    } catch (error) {
        console.log("Auth Grant Failed", error);
    }
    
}

/**
 * Updates our db config with new token.
 */
function updateAccess() {
    var configs = db.getCollection(CONSTANTS.CONFIG);
    var auth = configs.findOne({
        name: CONSTANTS.AUTH
    });
    auth.access_token = spotifyApi.getAccessToken();
    auth.refresh_token = spotifyApi.getRefreshToken();
    auth.expires = moment().add(1, 'h');
    configs.update(auth);
}

/**
 * Discovers if our auth token is expired.
 */
function isAuthExpired(){
    var configs = db.getCollection(CONSTANTS.CONFIG);
    var auth = configs.findOne( { name : CONSTANTS.AUTH });
    if (auth != null){
        if(moment().isAfter(auth.expires)){
            return true;
        }
    }
    return false;
}

// ------------------------
// Refresh Token Functions
// ------------------------
/**
 * Sets a CRON to update the access token.
 */
function setRefreshTokenCronJobs() {
    schedule.scheduleJob(CONSTANTS.CRONJOB1, '0 * * * *', () => {
        console.log('Refreshing Token');
        refreshToken();
    });
    schedule.scheduleJob(CONSTANTS.CRONJOB2, '30 * * * *', () => {
        console.log('Refreshing Token');
        refreshToken();
    });
}

/**
 * Calls the Spotify API to refresh the Access Token, updates Access Token.
 */
async function refreshToken() {
    try {
        let newRefresh = await spotifyApi.refreshAccessToken();
        console.log('The access token has been refreshed!');
        // Save the access token so that it's used in future calls
        spotifyApi.setAccessToken(newRefresh.body['access_token']);
        updateAccess();
    } catch (error) {
        console.log("Refreshing token failed", error);
    }
}

// ------------------------
// Spotify Settings
// ------------------------

async function settings(trigger_id){
    var configs = db.getCollection(CONSTANTS.CONFIG);
    var settings = configs.findOne( { name : CONSTANTS.SPOTIFY_CONFIG });
    console.log("TEST2");
    console.log(settings);
    var playlist = "";
    var disable_repeats = "";
    var disable_repeats_duration = "";
    var votes_skip = "";
    var back_to_playlist = "";
    var now_playing = "";
    if (settings != null){
        if (settings.playlist){
            playlist = settings.playlist;
        }
        if (settings.disable_repeats){
            disable_repeats = settings.disable_repeats;
        }
        if (settings.disable_repeats_duration){
            disable_repeats_duration = settings.disable_repeats_duration;
        }
        if (settings.votes_skip){
            votes_skip = settings.votes_skip;
        }
        if (settings.back_to_playlist){
            back_to_playlist = settings.back_to_playlist;
        }
        if (settings.now_playing){
            now_playing = settings.now_playing;
        }
    }

    var dialog = {
        "callback_id": CONSTANTS.SPOTIFY_CONFIG,
        "title": "Spotbot Settings",
        "submit_label": "Save",
        "elements": [
          {
            "type": "text",
            "label": "Playlist",
            "name": "playlist",
            "max_length": "100",
            "placeholder": "SpotbotPlaylist",
            "value": `${playlist}`,
            "hint": "The name of the playlist Spotbot will save to. If it does not exist Spotbot will create one for you."
          },
          {
            "type": "select",
            "label": "Disable repeats",
            "name": "disable_repeats",
            "value": `${disable_repeats}`,
            "hint" : "Disable the addition of the same song",
            "options": [
              {
                "label": "Yes",
                "value": "yes"
              },
              {
                "label": "No",
                "value": "no"
              }
            ]
          },
          {
            "type": "text",
            "label": "Disable repeats duration (hours)",
            "name": "disable_repeats_duration",
            "placeholder" : "3",
            "subtype" : "number",
            "value" : `${disable_repeats_duration}`,
            "optional" : "true",
            "hint": "The duration where no one can add the same song. Set it to 0 to disable repeats in the whole playlist. Integers only"
          },
          {
            "type": "select",
            "label": "Back to Playlist",
            "name": "back_to_playlist",
            "value": `${back_to_playlist}`,
            "hint" : "Enables the ability for Spotify to return to the playlist if it runs out of songs AND a new song is added",
            "options": [
              {
                "label": "Yes",
                "value": "yes"
              },
              {
                "label": "No",
                "value": "no"
              }
            ]
          },
          {
            "type": "select",
            "label": "Now playing messages",
            "name": "now_playing",
            "value": `${now_playing}`,
            "hint" : "Sends a now playing message when a song changes",
            "options": [
              {
                "label": "Yes",
                "value": "yes"
              },
              {
                "label": "No",
                "value": "no"
              }
            ]
          },
          {
            "type": "text",
            "label": "Votes needed to Skip",
            "name": "votes_skip",
            "placeholder" : "3",
            "value": `${votes_skip}`,
            "subtype" : "number",
            "hint": "The number of votes needed to skip a song. Integers only"
          }
        ]
      };

      var params = {
        token: process.env.SLACK_TOKEN,
        trigger_id: trigger_id,
        dialog : JSON.stringify(dialog)
      };
    // open the dialog by calling dialogs.open method and sending the payload
    try {
        let results = await slack.sendDialog(params);
        if (results.data.ok){
            return null;
        }
        else{
            console.log(results.data.error);
            return slack.reply("ephemeral", "Call for settings failed.");
        }
    } catch (error) {
        console.log(error);
    }
}

/**
 * 
 * @param {Spotify} submission 
 */
async function verify(submission){
    var configs = db.getCollection(CONSTANTS.CONFIG);
    var settings = configs.findOne( { name : CONSTANTS.SPOTIFY_CONFIG });
    var auth = configs.findOne( {name: CONSTANTS.AUTH });
    //Validate submissions
    var errors = [];
    if (submission.disable_repeats && submission.disable_repeats == ('no') && submission.disable_repeats_duration && !isPositiveInteger(submission.disable_repeats_duration)){
        errors.push(
            {
                "name": "disable_repeats_duration",
                "error": "Please enter a valid integer"
            }
        )
    }
    if (!isPositiveInteger(submission.votes_skip)){
        errors.push(
            {
                "name" : "votes_skip",
                "error" : "Please enter a valid integer"
            }
        )
    }
    if (errors.length > 0){
        return {errors};
    }
    else{
        console.log("NO errors bro");
        if (settings == null) {
            configs.insert({
                name: CONSTANTS.SPOTIFY_CONFIG
            });
            settings = configs.findOne( { name : CONSTANTS.SPOTIFY_CONFIG });
        }
        // Add to DB.
        settings.disable_repeats = submission.disable_repeats;
        settings.votes_skip = submission.votes_skip;
        settings.back_to_playlist = submission.back_to_playlist;
        settings.now_playing = submission.now_playing;
        if (submission.disable_repeats_duration && submission.disable_repeats == ('yes')) {
            settings.disable_repeats_duration = submission.disable_repeats_duration;
        } else {
            settings.disable_repeats_duration = "";
        }
        if (settings.playlist != submission.playlist) {
            //TODO Update Playlist on Spotify
            try {
                let result = await spotifyApi.getUserPlaylists({ limit: 50 });
                console.log(result);
                for (playlist of result.body.items) {
                    // If a playlist currently exists
                    if (submission.playlist == playlist.name) {
                        settings.playlist = submission.playlist;
                        settings.playlist_id = playlist.id;
                        configs.update(settings);
                        return slack.reply("ephemeral", "Settings successfully saved.");
                    }
                }
                // Doesn't exist, let's make one.
                try {
                    let createdPlaylist = await spotifyApi.createPlaylist(auth.id, submission.playlist, {public : false, collaborative : true });
                    console.log(createdPlaylist);
                    settings.playlist_id = createdPlaylist.body.id;
                    settings.playlist = submission.playlist;
                    configs.update(settings);
                    return(slack.reply("ephemeral", "Settings successfully saved."));
                } catch (error) {
                    console.log("Error creating Playlist", error);
                    return(slack.reply("ephemeral", "An error occured, settings were not saved."));
                }
            } catch (error) {
                console.log("Failed to get User Playlists", error);
                return(slack.reply("ephemeral", "An error occured, settings were not saved."));
            }
        }
        else{
            configs.update(settings);
            return(slack.reply("ephemeral", "Settings successfully saved."));
        }
    }

}

function isPositiveInteger(n) {
    return n >>> 0 === parseFloat(n);
}

module.exports = {
    getAccessToken,
    setup,
    api: spotifyApi,
    authenticate,
    settings,
    verify,
    configDb : db
}