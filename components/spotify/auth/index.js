const moment = require('moment');
const logger = require('../../../log/winston');

const spotifyAuthService = require('./spotifyAuthService');
const spotify_auth_api = require('./spotifyAuthAPI').spotifyApi;
const spotify_auth_dal = require('./spotifyAuthDAL');

class spotifyAuthController {
    constructor(slack_controller, slack_formatter){
        this.slack_controller = slack_controller;
        this.spotifyApi = spotify_auth_api;
        this.spotify_auth_service = spotifyAuthService.create(slack_controller, slack_formatter);
    }
    async initialise() {
        await this.spotify_auth_service.initialise();
    }
    
    async isAuth(req, res, next){
        try {
            if (req.baseUrl == '/settings' && req.body.text == "auth"){
                next(); // To get to the auth.
            }
            else if (this.spotify_auth_service.isAuthSetup()){
                res.send();
                await this.slack_controller.reply("Please run `/spotbot auth` to authenticate", null, req.body.response_url);
            }
            else if (this.spotify_auth_service.isAuthExpired()){
                res.send();
                await this.slack_controller.reply("Your Spotify Auth has expired. Please re-run `/spotbot auth` to re-aunthenticate", null, req.body.response_url);
            } else {
                next();
            }
        } catch (error) {
            logger.error(`IsAuth failed`, error);
        }
    }
    
    async setupAuth(req, res) {
        try {
            logger.info(`Setting up Spotify auth`);
            await this.spotify_auth_service.setupAuth(req.body.trigger_id, req.body.response_url, req.body.channel_id, req.headers.host);
        } catch (error) {
            logger.error(`Setting up auth failed`, error);
        }
    }
    
    async getTokens(req, res) {
        try {
            logger.info(`Setting up Tokens`);
            res.redirect(await this.spotify_auth_service.getTokens(req.query.code, req.query.state));
        } catch (error) {
            logger.error(`Setting up tokens failed`, error);
        }
    }
    
    getSpotifyUserId(){
        return spotify_auth_dal.getSpotifyUserId();
    }
    
}

function create(slack_controller, slack_formatter){
    return new spotifyAuthController(slack_controller, slack_formatter);
}


module.exports = {
    create
}