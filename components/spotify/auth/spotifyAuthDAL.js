const moment = require('moment');

const CONSTANTS = require('../../../constants');
const config = require('../../../db/config');

/**
 * Get the Spotify Auth settings.
 */
function getAuth(){
    return config.find(CONSTANTS.DB.COLLECTION.AUTH);
}

function getSpotifyUserId(){
    let auth = getAuth();
    return auth.spotify_user_id;
}

/**
 * Updates our db config with the new tokens.
 */
function updateTokens(access_token, refresh_token) {
    let auth = getAuth();
    auth.access_token = access_token;
    auth.refresh_token = refresh_token;
    auth.expires = moment().add(1, 'h');
    config.update(auth);
}

/**
 * Set the authentication details
 * @param {string} trigger_id Slack trigger id
 * @param {Date} trigger_expires Moment object
 * @param {string} response_url Slack response URL
 * @param {string} channel_id Slack channel id
 */
function setAuth(trigger_id, trigger_expires, channel_id, response_url){
    let auth = getAuth();
    auth.trigger_id = trigger_id;
    auth.trigger_expires = trigger_expires;
    auth.response_url = response_url;
    auth.channel_id = channel_id;
    config.update(auth);
}

function expireAuth(){
    let auth = getAuth();
    auth.expires = moment();
    config.update(auth);
}

function setSpotifyUserId(user_id){
    let auth = getAuth();
    auth.spotify_user_id = user_id;
    config.update(auth);
}

/**
 * Create a new Auth object
 */
function setupAuth(){
    config.create(CONSTANTS.DB.COLLECTION.AUTH);
}

module.exports = {
    expireAuth,
    getAuth,
    getSpotifyUserId,
    setAuth,
    setSpotifyUserId,
    setupAuth,
    updateTokens
}