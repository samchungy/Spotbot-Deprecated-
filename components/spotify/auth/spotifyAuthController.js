const moment = require('moment');
const logger = require('../../../log/winston');

const slack_controller = require('../../slack/slackController');
const spotify_auth_service = require('./spotifyAuthService');
const spotify_auth_api = require('./spotifyAuthAPI').spotifyApi;
const spotify_auth_dal = require('./spotifyAuthDAL');

async function initialise() {
    await spotify_auth_service.initialise();
}

async function isAuth(req, res, next){
    try {
        if (req.baseUrl == '/settings' && req.body.text == "auth"){
            next(); // To get to the auth.
        }
        else if (spotify_auth_service.isAuthSetup()){
            res.send();
            await slack_controller.reply("Please run `/spotbot auth` to authenticate", null, req.body.response_url);
        }
        else if (spotify_auth_service.isAuthExpired()){
            res.send();
            await slack_controller.reply("Your Spotify Auth has expired. Please re-run `/spotbot auth` to re-aunthenticate", null, req.body.response_url);
        } else {
            next();
        }
    } catch (error) {
        logger.error(`IsAuth failed`, error);
    }
}

async function setupAuth(req, res) {
    try {
        logger.info(`Setting up Spotify auth`);
        await spotify_auth_service.setupAuth(req.body.trigger_id, req.body.response_url, req.body.channel_id, req.headers.host);
    } catch (error) {
        logger.error(`Setting up auth failed`, error);
    }
}

async function getTokens(req, res) {
    try {
        logger.info(`Setting up Tokens`);
        res.redirect(await spotify_auth_service.getTokens(req.query.code, req.query.state));
    } catch (error) {
        logger.error(`Setting up tokens failed`, error);
    }
}

function getSpotifyUserId(){
    return spotify_auth_dal.getSpotifyUserId();
}

module.exports = {
    initialiseAuth: initialise,
    isAuth,
    getSpotifyUserId,
    getTokens,
    setupAuth,
    spotify_api: spotify_auth_api
}