//Load Spotify Node SDK
const CONSTANTS = require('./constants');
const SpotifyWebApi = require('spotify-web-api-node');
//Cron module for scheduling refresh
const Cronjob = require('cron').CronJob;
const moment = require('moment');
const axios = require('axios');

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
        //If auth is called again, we want to update it
        if (configs.count() == 0) {
            //Save config in our db
            configs.insert([{
                name: CONSTANTS.SPOTIFY_CONFIG,
                access_token: spotifyApi.getAccessToken(),
                refresh_token: spotifyApi.getRefreshToken(),
                expires: moment().add(1, 'h')
            }]);
            setRefreshTokenCronJobs();
        } else {
            updateAccess();
        }
    } catch (error) {
        console.log("Auth Grant Failed", error);
    }
}

/**
 * Sets a CRON to update the access token.
 */
function setRefreshTokenCronJobs() {
    // Cronjobs to run refresh every 0th and 30th minute.
    new Cronjob('0 * * * *', () => {
        console.log('Refreshing Token');
        refreshToken();
    }, null, true, 'Australia/Sydney');

    new Cronjob('30 * * * *', () => {
        console.log('Refreshing Token');
        refreshToken();
    }, null, true, 'Australia/Sydney');
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
    setRefreshTokenCronJobs();
    // kick off any program logic or start listening to external events
    var test = "Let's dance to joy division"
    // find(test);
}

function setup(user_id, trigger_id, response_url){
    var configs = db.getCollection(CONSTANTS.CONFIG);
    var admins = configs.by(CONSTANTS.NAME, CONSTANTS.ADMIN);
    var auth = configs.by(CONSTANTS.NAME, CONSTANTS.AUTH);
    // Assign user as admin.
    if (admins == null){
        console.log("Adding admin");
        configs.insert({
            name: CONSTANTS.ADMIN,
            users: [user_id]
        });
        sendToSlack("You have been added as the admin of Spotbot", response_url, "ephemeral");
    }
    // Start Spotify Auth
    if (auth == null){
        console.log("Adding auth");
        return authenticate(trigger_id);
    }
}

function authenticate(trigger_id){
    // Create the authorization URL
    var authorizeURL = spotifyApi.createAuthorizeURL(scopes, trigger_id);
    return {
        response_type: "ephemeral",
        attachments: [
            {
                fallback: "Please visit the following link to authenticate your Spotify account: " + authorizeURL,
                actions: [
                    {
                        "type": "button",
                        "style": "primary",
                        "text": ":link: Please visit the following link to authenticate your Spotify account",
                        "url": authorizeURL
                    }
                ]
            }
        ]
    };
}

async function sendToSlack(message, response_url, response_type){
    try {
        await axios.post(response_url, {
            "response_type" : response_type,
            "text" : message
        });
        console.log("Message sent");
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    getAccessToken,
    setup,
    api: spotifyApi
}