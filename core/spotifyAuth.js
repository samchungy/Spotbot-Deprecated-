const CONSTANTS = require('../constants');
const spotify = require ('../controllers/spotify');
//Cron module for scheduling refresh
const schedule = require('node-schedule');
const slack = require('../controllers/slackController');
const moment = require('moment');
const config = require('../db/config');
const logger = require('../log/winston');

/**
 * Initialise/load the persistant lokijs database, start up CRON jobs.
 */
function initialise() {
    if (isAuthExpired()) {
        logger.info("Need to get a new authentication token from Spotify");
        return;
    }
    // Re-configure the Spotify Api
    var auth = config.getAuth();
    spotify.updateTokens(auth.access_token, auth.refresh_token);
    setRefreshTokenCronJob();
}

// ------------------------
// Auth Functions
// ------------------------
/**
 * Returns a Spotify authorisation URL
 * @param {string} trigger_id 
 * @param {string} response_url 
 */
async function authenticate(trigger_id, response_url, channel_id, url){
    try {
        var url_redirect = "http://" + url + "/auth";
        var thirty = moment().add(30, 'm');
        var auth = config.getAuth();
        // If previously exists:
        if (auth == null){
            config.setAuth();
            auth = config.getAuth();
        }
        config.setAuth(trigger_id, thirty, response_url, channel_id);
        // Create the authorization URL
        let authorizeURL = await spotify.getAuthorizeURL(trigger_id, url_redirect);
        return authorizeURL;
    } catch (error) {
        logger.error(`Authentication failed ${JSON.stringify(error)}`, error);
    }

}

/**
 * Get Access and Refresh Token from Spotify.
 * @param {String} code Code passed from Spotify Authorization Code Flow 
 */
async function getAccessToken(code, state) {
    try {
        var auth = config.getAuth();
        if (auth.trigger_id != state){
            await slack.sendEphemeralReply(":no_entry: Invalid State, Please re-authenticate again", null, auth.response_url);
            return `slack://channel?id=${auth.channel_id}&team=${auth.team_id}`;

        }
        else if (moment().isAfter(moment(auth.trigger_expires))){
            await slack.sendEphemeralReply(":no_entry: Your authentication window has expired. Please try again", null, auth.response_url);
            return `slack://channel?id=${auth.channel_id}&team=${auth.team_id}`;
        }
        else{
            await (spotify.authorizationCodeGrant(code));
            //Save config in our db
            updateAccess();
            setRefreshTokenCronJob();
            var auth = config.getAuth();
            // Get Spotify ID (For playlist addition later)
            let profile = await spotify.spotifyApi.getMe();
            auth.id = profile.body.id;
            config.update(auth);
            var settings = config.getSpotifyConfig();
            var text = ":white_check_mark: Successfully authenticated."
            if (settings == null){
                text += " Run `/spotbot settings` to setup Spotify. "
            }
            await slack.sendEphemeralReply(text, null, auth.response_url);
            return `slack://channel?id=${auth.channel_id}&team=${auth.team_id}`;
        }
    } catch (error) {
        logger.error(`Auth grant failed ${JSON.stringify(error)}`, error);
    }
    
}

/**
 * Discovers if our auth token is expired.
 */
function isAuthExpired(){
    var auth = config.getAuth();
    if (auth == null || moment().isAfter(auth.expires)){
            return true;
        }
    return false;
}

async function isAuthed(req, res, next){
    try {
        if (isAuthExpired()){
            await slack.sendReply("Your Spotify Auth has expired. Please re-run `/spotbot auth` to re-aunthenticate", null, req.body.response_url);
            res.send();
        } else {
            next();
        }
    } catch (error) {
        logger.error(`IsAuthed failed ${JSON.stringify(error)}`, error);
    }

}

function isAuthed2(response_url){
    try {
        if (isAuthExpired()){
            slack.sendReply("Please run `/spotbot auth` to aunthenticate", null, response_url);
            return false;
        } else {
            return true;
        }
    } catch (error) {
        logger.error(`IsAuthed2 failed ${JSON.stringify(error)}`, error);
    }
}

// ------------------------
// Refresh Token Functions
// ------------------------
/**
 * Sets a CRON to update the access token.
 */
function setRefreshTokenCronJob() {
    logger.info("Cronjob Set");
    schedule.scheduleJob(CONSTANTS.CRONJOB1, '*/30 * * * *', () => {
        try {
            logger.info("Token refreshed");
            refreshToken();
        } catch (error) {
            logger.error(`Refresh Token Cron Job Failed ${JSON.stringify(error)}`, error);
        }

    });
}

/**
 * Calls the Spotify API to refresh the Access Token, updates Access Token.
 */
async function refreshToken() {
    try {
        await spotify.renewAccessToken();
        updateAccess();
    } catch (error) {
        logger.error(`Refreshing token failed ${JSON.stringify(error)}`, error);
    }

}

/**
 * Updates our db config with the new tokens.
 */
function updateAccess() {
    var auth = config.getAuth();
    var tokens = spotify.getTokens();
    auth.access_token = tokens.access;
    auth.refresh_token = tokens.refresh;
    auth.expires = moment().add(1, 'h');
    config.update(auth);
}

module.exports = {
    authenticate,
    getAccessToken,
    initialise,
    isAuthExpired,
    isAuthed,
    isAuthed2
}