// @ts-check
//Load Spotify Node SDK
const CONSTANTS = require('../constants');
const SpotifyWebApi = require('spotify-web-api-node');
const logger = require('../log/winston');

// Setting credentials can be done in the wrapper's constructor, or using the API object's setters.
var spotifyApi = new SpotifyWebApi({
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});


/**
 * 
 * @param {string} code Code obtained from Spotify Authorization flow
 */
async function authorizationCodeGrant(code){
    try{
        let tokens = await spotifyApi.authorizationCodeGrant(code);
        logger.info(`Token refreshed`);
        updateTokens(tokens.body['access_token'], tokens.body['refresh_token']);
    }
    catch(error){
        logger.error(`Auth Code Grant failed ${error}`);
        throw Error(error);
    }
}
/**
 * Create authorization URL for Spotify
 * @param {string} trigger_id Slack trigger id
 * @returns Authorization URL
 */
async function getAuthorizeURL(trigger_id){
    try {
        let authorize_url = await spotifyApi.createAuthorizeURL(CONSTANTS.SCOPES, trigger_id);
        return authorize_url;
    } catch (error) {
        logger.error(`Get AUTH url failed ${error}`);
        throw Error(error);
    }
}

function updateTokens(access_token, refresh_token){
    if (access_token){
        spotifyApi.setAccessToken(access_token);
    }
    if (refresh_token){
        spotifyApi.setRefreshToken(refresh_token);
    }
}

function getTokens(){
    return { 
        access: spotifyApi.getAccessToken(),
        refresh: spotifyApi.getRefreshToken() 
    };
}

async function renewAccessToken(){
    try {
        let access_token = await spotifyApi.refreshAccessToken();
        spotifyApi.setAccessToken(access_token.body['access_token']);
    } catch (error) {
        logger.error(`Remnewing Access Token Failed ${error}`);
        throw Error(error);
    }
}

module.exports = {
    authorizationCodeGrant,
    getTokens,
    getAuthorizeURL,
    renewAccessToken,
    updateTokens,
    spotifyApi
}