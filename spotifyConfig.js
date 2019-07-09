//Load Spotify Node SDK
const CONSTANTS = require('./constants');
const SpotifyWebApi = require('spotify-web-api-node');
//Cron module for scheduling refresh
const Cronjob = require('cron').CronJob;
const moment = require('moment');
const slack = require('./slackController');
var cronjob1 = null;
var cronjob2 = null;

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
 * Get Access and Refresh Token from Spotify.
 * @param {String} code Code passed from Spotify Authorization Code Flow 
 */
async function getAccessToken(code) {
    try {
        let getAccess = await (spotifyApi.authorizationCodeGrant(code))
        console.log('The token expires in ' + getAccess.body['expires_in']);
        console.log('The access token is ' + getAccess.body['access_token']);
        console.log('The refresh token is ' + getAccess.body['refresh_token']);
        spotifyApi.setAccessToken(getAccess.body['access_token']);
        spotifyApi.setRefreshToken(getAccess.body['refresh_token']);
        //Save config in our db
        var configs = db.getCollection(CONSTANTS.CONFIG);
        var auth = configs.findOne( { name : CONSTANTS.AUTH });
        updateAccess();
        stopCronJobs();
        setRefreshTokenCronJobs();

        // if (auth == null) {
        //     //Save config in our db
        //     configs.insert([{
        //         name: CONSTANTS.AUTH,
        //         access_token: spotifyApi.getAccessToken(),
        //         refresh_token: spotifyApi.getRefreshToken(),
        //         expires: moment().add(1, 'h')
        //     }]);
        //     setRefreshTokenCronJobs();
        // } else {
        //     updateAccess();
        // }
    } catch (error) {
        console.log("Auth Grant Failed", error);
    }
    
}

/**
 * Sets a CRON to update the access token.
 */
function setRefreshTokenCronJobs() {
    // Cronjobs to run refresh every 0th and 30th minute.
    cronjob1 = new Cronjob('0 * * * *', () => {
        console.log('Refreshing Token');
        refreshToken();
    }, null, true, 'Australia/Sydney');

    cronjob2 = new Cronjob('30 * * * *', () => {
        console.log('Refreshing Token');
        refreshToken();
    }, null, true, 'Australia/Sydney');
}

function stopCronJobs(){
    if (cronjob1){
        cronjob1.stop();
    }
    if(cronjob2){
        ctronjob2.stop();
    }
    console.log("Cronjobs disabled");
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
        // slack.sendToSlack("You have been added as the admin of Spotbot", response_url, "ephemeral");
    }
    // Start Spotify Auth
    if (auth == null){
        console.log("Adding auth");
        var msg = authenticate(trigger_id);
        console.log(JSON.toString(msg));
        return msg;
    }
    console.log("no action");
}

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

function authenticate(trigger_id){
    var configs = db.getCollection(CONSTANTS.CONFIG);
    var auth = configs.findOne( { name : CONSTANTS.AUTH });
    if (auth != null){
        auth.trigger_id = trigger_id;
        configs.update(auth);
    }
    else{
        configs.insert({
            name: CONSTANTS.AUTH,
            trigger_id: trigger_id
        });
    }

    // Create the authorization URL
    var authorizeURL = spotifyApi.createAuthorizeURL(CONSTANTS.SCOPES, trigger_id);
    return slack.reply("ephemeral", "Please visit the following link to authenticate your Spotify account", [{
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



module.exports = {
    getAccessToken,
    setup,
    api: spotifyApi
}