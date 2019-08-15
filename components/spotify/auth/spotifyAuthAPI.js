//Load Spotify Node SDK
const CONSTANTS = require('../../../constants');
const SpotifyWebApi = require('spotify-web-api-node');
const logger = require('../../../log/winston');

// Setting credentials can be done in the wrapper's constructor, or using the API object's setters.
var spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});

/**
 * Get Access & Refresh token from Spotify
 * @param {string} code Code obtained from the Spotify Authorization flow
 */
async function getTokens(code){
    try{
        logger.info(`Starting to obtain tokens with code`)
        let tokens = await spotifyApi.authorizationCodeGrant(code);
        updateTokens(tokens.body['access_token'], tokens.body['refresh_token']);
        return {
            access_token: tokens.body['access_token'],
            refresh_token : tokens.body['refresh_token']
        }
    }
    catch(error){
        logger.error(`Auth Code Grant failed `, error);
        throw Error(error);
    }
}

async function getProfile(){
    try {
        return await spotifyApi.getMe();
    } catch (error) {
        logger.error(`SPOTIFY API: Get Me failed`, error);
        throw Error(error);
    }
}

/**
 * Create authorization URL for Spotify
 * @param {string} trigger_id Slack trigger id
 * @returns Authorization URL
 */
async function getAuthorizeURL(trigger_id, url){
    try {
        spotifyApi.setRedirectURI(url);
        let authorize_url = await spotifyApi.createAuthorizeURL(CONSTANTS.SCOPES, trigger_id);
        return authorize_url;
    } catch (error) {
        logger.error(`Get AUTH url failed`, error);
        throw Error(error);
    }
}

/**
 * Update the Spotify API with new tokens obtained.
 * @param {string} access_token 
 * @param {string} refresh_token 
 */
function updateTokens(access_token, refresh_token){
    if (access_token){
        spotifyApi.setAccessToken(access_token);
    }
    if (refresh_token){
        spotifyApi.setRefreshToken(refresh_token);
    }
}

/**
 * Renew the access token.
 */
async function renewAccessToken(){
    try {
        let access_token = await spotifyApi.refreshAccessToken();
        spotifyApi.setAccessToken(access_token.body['access_token']);
        return {
            access_token : spotifyApi.getAccessToken(),
            refresh_token: spotifyApi.getRefreshToken()
        }
    } catch (error) {
        logger.error(`Renewing Access Token Failed`, error);
        throw Error(error);
    }
}

/**
 * 
 */

module.exports = {
    getAuthorizeURL,
    getProfile,
    getTokens,
    renewAccessToken,
    spotifyApi,
    updateTokens
}