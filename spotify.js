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
    redirectUri = process.env.SPOTIFY_REDIRECT_URI,
    clientId = process.env.SPOTIFY_CLIENT_ID,
    clientSecret = process.env.SPOTIFY_CLIENT_SECRET,
    state = 'some-state-of-my-choice';

// Setting credentials can be done in the wrapper's constructor, or using the API object's setters.
var spotifyApi = new SpotifyWebApi({
    redirectUri: redirectUri,
    clientId: clientId,
    clientSecret: clientSecret
});

//Load Lokijs db
const CONFIG_FILE = "config.db"
const SPOTIFY_CONFIG = "spotifyconfig"
const CONFIG = "config"
const loki = require('lokijs');
var db = new loki(CONFIG_FILE, {
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
        var configs = db.getCollection(CONFIG);
        //If auth is called again, we want to update it
        if (configs.count() == 0) {
            //Save config in our db
            configs.insert([{
                name: SPOTIFY_CONFIG,
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
    var configs = db.getCollection(CONFIG);
    var config = configs.findOne({
        name: SPOTIFY_CONFIG
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
    var configs = db.getCollection(CONFIG);
    // If collection is empty do not load it.
    if (configs === null || configs.count() == 0) {
        configs = db.addCollection(CONFIG);
        return;
    }
    console.log("Old Config Loaded");
    var config = configs.findOne({
        name: SPOTIFY_CONFIG
    });
    if (moment().isAfter(config.expires)) {
        console.log("Need to get a new access token");
        return;
    }
    spotifyApi.setAccessToken(config.access_token);
    spotifyApi.setRefreshToken(config.refresh_token);
    set_refresh_token_cron_jobs();
    // kick off any program logic or start listening to external events
}

exports.get_access_token = get_access_token;