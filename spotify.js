//Load Constants
const CONSTANTS = require('./constants');
//Load Spotify Node SDK
const SpotifyWebApi = require('spotify-web-api-node');
//Cron module for scheduling refresh
const Cronjob = require('cron').CronJob;
const moment = require('moment');

// Spotify Creds
var scopes = ['user-read-recently-played',
        'user-read-playback-state',
        'user-modify-playback-state',
        'playlist-modify-public',
        'streaming'
    ],
    state = 'some-state-of-my-choice';

// Setting credentials can be done in the wrapper's constructor, or using the API object's setters.
var spotifyApi = new SpotifyWebApi({
    redirectUri: "",
    clientId: "",
    clientSecret: ""
});

//Load Lokijs db
const DEFAULT_DEVICE_ID = '6d2e33d004c05821b7be5da785dbc3a2c55eeca7';
const loki = require('lokijs');
var db = new loki(CONSTANTS.CONFIG_FILE, {
    autoload: true,
    autoloadCallback: initialise,
    autosave: true
});

// Create the authorization URL
var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
console.log(authorizeURL);

/**
 * Get Access and Refresh Token from Spotify.
 * @param {String} code Code passed from Spotify Authorization Code Flow 
 */
async function get_access_token(code) {
    try {
        let getAccess = await (spotifyApi.authorizationCodeGrant(code))
        console.log('The token expires in ' + getAccess.body['expires_in']);
        console.log('The access token is ' + getAccess.body['access_token']);
        console.log('The refresh token is ' + getAccess.body['refresh_token']);
        spotifyApi.setAccessToken(getAccess.body['access_token']);
        spotifyApi.setRefreshToken(getAccess.body['refresh_token']);
        //Save config in our db
        var configs = db.getCollection(CONSTANTS.CONFIG);
        //If auth is called again, we want to update it
        if (configs.count() == 0) {
            //Save config in our db
            configs.insert([{
                name: CONSTANTS.SPOTIFY_CONFIG,
                access_token: spotifyApi.getAccessToken(),
                refresh_token: spotifyApi.getRefreshToken(),
                expires: moment().add(1, 'h')
            }]);
            set_refresh_token_cron_jobs();
        } else {
            update_access();
        }
    } catch (error) {
        console.log("Auth Grant Failed", error);
    }
}

/**
 * Sets a CRON to update the access token.
 */
function set_refresh_token_cron_jobs() {
    // Cronjobs to run refresh every 0th and 30th minute.
    new Cronjob('0 * * * *', () => {
        console.log('Refreshing Token');
        refresh_token();
    }, null, true, 'Australia/Sydney');

    new Cronjob('30 * * * *', () => {
        console.log('Refreshing Token');
        refresh_token();
    }, null, true, 'Australia/Sydney');
}

/**
 * Calls the Spotify API to refresh the Access Token, updates Access Token.
 */
async function refresh_token() {
    try {
        let newRefresh = await spotifyApi.refreshAccessToken();
        console.log('The access token has been refreshed!');
        // Save the access token so that it's used in future calls
        spotifyApi.setAccessToken(newRefresh.body['access_token']);
        update_access();
    } catch (error) {
        console.log("Refreshing token failed", error);
    }
}

/**
 * Updates our db config with new token.
 */
function update_access() {
    var configs = db.getCollection(CONSTANTS.CONFIG);
    var config = configs.findOne({
        name: CONSTANTS.SPOTIFY_CONFIG
    });
    config.access_token = spotifyApi.getAccessToken();
    config.refresh_token = spotifyApi.getRefreshToken();
    config.expires = moment().add(1, 'h');
    configs.update(config);
}

/**
 * Initialise/load the persistant lokijs database, start up CRON jobs.
 */
function initialise() {
    var configs = db.getCollection(CONSTANTS.CONFIG);
    // If collection is empty do not load it.
    if (configs === null || configs.count() == 0) {
        configs = db.addCollection(CONSTANTS.CONFIG);
        db.addCollection(CONSTANTS.TRACK, CONSTANTS.TRACK_OBJ);
        return;
    }
    console.log("Old Config Loaded");
    var config = configs.findOne({
        name: CONSTANTS.SPOTIFY_CONFIG
    });
    if (moment().isAfter(config.expires)) {
        console.log("Need to get a new access token");
        return;
    }
    spotifyApi.setAccessToken(config.access_token);
    spotifyApi.setRefreshToken(config.refresh_token);
    set_refresh_token_cron_jobs();
    // kick off any program logic or start listening to external events
    // find(test);
}

/**
 * Hits play on Spotify
 */
async function play() {
    try {
        let playerinfo = await spotifyApi.getMyCurrentPlaybackState();
        if (playerinfo.body.is_playing != null && playerinfo.body.is_playing) {
            return (":information_source: Spotify is already playing.")
        }
        if (playerinfo.body.device != null) {
            try {
                await spotifyApi.play();
                return (":arrow_forward: Spotify is now playing.");
            } catch (error) {
                console.log("Regular play failed", error);
            }
        }
    } catch (error) {
        console.log("Get player info failed", error);
    }
    try {
        console.log("Trying Spotify transfer playback workaround");
        let devicelist = await spotifyApi.getMyDevices();
        if (devicelist.body.devices.length == 0){
            return (":information_source: Your Spotify device is currently closed.");
        }
        for (var device of devicelist.body.devices){
            if (device.id === DEFAULT_DEVICE_ID){
                try {
                    var options = {deviceIds : DEFAULT_DEVICE_ID, play: true };
                    let transferplayback = await spotifyApi.transferMyPlayback(options);
                    return (":arrow_forward: Spotify is now playing.");
                } catch (error) {
                    console.log("Transfer playback failed", error);
                }
            }
        }
    } catch (error){
        console.log("Failed Spotify transfer playback workaround",error);
    }
}
/**
 * Hits pause on Spotify
 */
async function pause() {
    try {
        let playerinfo = await spotifyApi.getMyCurrentPlaybackState();
        console.log(playerinfo);
        console.log(playerinfo.body.is_playing);
        if (playerinfo.body.is_playing != null){
            if (!playerinfo.body.is_playing){
                return ( ":information_source: Spotify is already paused.");
            }
            else{
                try {
                    let playstate = await spotifyApi.pause();
                    return (":double_vertical_bar: Spotify is now paused.");
                } catch (error) {
                    console.log("Pause on Spotify failed", error);
                }
            }
        }
        else{
            try {
                let devices = await spotifyApi.getMyDevices();
                if (devices.body.devices.length > 0){
                    return ( ":information_source: Spotify is already paused.");
                }
                else{
                    return (":information_source: Your Spotify is currently closed.");
                }
            } catch (error) {
                console.log("Get device info failed", error);
            }
        }
    } catch (error) {
        console.log("Get player info failed", error);
    }

}
/**
 * Gets up to 3 tracks
 * @param {Slack trigger id} trigger_id 
 */
function get_three_tracks(trigger_id){
    // Get tracks from DB
    var tracks = db.getCollection(CONSTANTS.TRACK);
    var search = tracks.by(CONSTANTS.TRIGGER_ID, trigger_id);
    if (search == null){
        return ":slightly_frowning_face: I'm sorry, your search expired. Please try another one."
    }
    if (search.tracks.length == 0){
        tracks.remove(search);
        return ":information_source: No more tracks. Try another search."
    }
    // Get 3 tracks, store in previous tracks.
    var previous_tracks = search.tracks.splice(0,3);
    var slack_attachments = []
    if (previous_tracks.length != 0){
        for (let track of previous_tracks){
            slack_attachments.push(spotify_to_slack_attachment(track, trigger_id));
        }
    }
    // Update DB
    tracks.update(search);
    
    if (slack_attachments.length == 0){
        console.log("none");
        return {
            "response_type" : "ephemeral",
            "text" : "No more tracks, try another search."
        }
    }
    else{
        slack_attachments.push({
            "callback_id": trigger_id,
            "fallback" : "See more tracks",
            "actions": [{
                "text": "See more tracks",
                "type": "button",
                "name": CONSTANTS.SEE_MORE_TRACKS,
                "value": CONSTANTS.SEE_MORE_TRACKS
            }]
        });
        var response = {
            "response_type" : "ephemeral",
            "text" : "Are these the tracks you were looking for?",
            "attachments" : slack_attachments
        };
        console.log(slack_attachments);
        console.log(response);
        return response;
    }
}

function spotify_to_slack_attachment(track, trigger_id){
    var artist = track.artists[0].name;
    var album = track.album.name;
    var image = track.album.images[0].url;
    var attachment = {
        "color": "#36a64f",
        "title": track.name,
        "title_link": track.external_urls.spotify,
        "text": `:studio_microphone: *Artist* ${artist}\n\n :cd: *Album* ${album}`,
        "thumb_url": `${image}`,
        "callback_id": trigger_id,
        "actions": [{
            "text": "Add to playlist",
            "type": "button",
            "style": "primary",
            "name": track.uri,
            "value": track.uri
        }]
    }
    return attachment;
}
async function test() {
    await find("Joy division", "1234", "1234");
}
/**
 * Finds songs based on a query on Spotify
 * @param {String} query Search term
 */
async function find(query, user_id, trigger_id) {
    try {
        let searchresults = await spotifyApi.searchTracks(query, { limit: 21 });
        if (searchresults.body.tracks.items.length == 0){
            //No Tracks found
            return {
                "response_type": "ephemeral",
                "text": `:slightly_frowning_face: No tracks found for the search term "${query}". Try another search?`
              }
        }
        else{
            // Store in our db
            var tracks = db.getCollection(CONSTANTS.TRACK);
            tracks.insert({
                trigger_id: trigger_id,
                user: user_id,
                tracks: searchresults.body.tracks.items
            });
            return get_three_tracks(trigger_id);
        }
    } catch (error) {
        console.log("Find track on Spotify failed", error);
    }
}

module.exports = {
    get_access_token,
    play,
    pause,
    find,
    get_three_tracks
};