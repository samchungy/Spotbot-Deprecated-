// const spotifyController = require('..spotifyController');
const tracks = require('./tracksService');
const CONSTANTS = require('../../../constants');
const logger = require('../../../log/winston');

class trackController {
    constructor(slack_controller, slack_formatter, settings_controller, player_controller, blacklist_controller, spotify_auth_controller){
        this.slack_controller = slack_controller;
        this.tracks_service = tracks.create(slack_controller, slack_formatter, settings_controller, player_controller, blacklist_controller, spotify_auth_controller);
    }
    async find(req, res){
        try {
            await this.tracks_service.find(req.body.text, req.body.trigger_id, req.body.response_url, false);
        } catch (error) {
            logger.error(`Finding song failed`, error);
        }
    }
    
    async findPop(req, res){
        try {
            await this.tracks_service.findPop(req.body.text, req.body.trigger_id, req.body.response_url);
        } catch (error) {
            logger.error(`Finding song failed`, error);
        }
    }
    
    async findArtistTracks(text, trigger_id, response_url){
        try {
            await this.tracks_service.find(text, trigger_id, response_url, true);
        } catch (error) {
            logger.error(`Finding song failed`, error);
        }
    }
    
    deleteOrAckReply(req, res, name){
        if (CONSTANTS.SLACK.PAYLOAD.DELETABLE.includes(name)){
            this.slack_controller.deleteAndAck(req, res);
        } else {
            res.send();
        }
    }
    
    async seeMoreTracks(payload){
        try {
            await this.tracks_service.getThreeTracks(payload.callback_id, payload.actions[0].value, payload.response_url);
        } catch (error) {
            logger.error("See more tracks failed", error);
        }
    }
    
    async addTrack(payload){
        try {
            await this.tracks_service.addTrack(payload.callback_id, payload.actions[0].value, payload.user.id);
        } catch (error) {
            logger.error("Add track failed", error);
        }
    }
    
    async whom(req, res){
        try {
            logger.info("Whom triggered");
            await this.tracks_service.whom(req.body.response_url);
        } catch (error) {
            logger.error("Whom failed", error);
        }
    }
    
    async initialiseClear(){
        try {
            await this.tracks_service.initaliseSearchClear();
        } catch (error) {
            logger.error("Initialise clear failed - ", error);
        }
    }
    
    async cancelSearch(payload){
        try {
            await this.tracks_service.cancelSearch(payload.callback_id, payload.response_url);
        } catch (error) {
            logger.error("Cancelling search failed - ", error);
        }
    }
    
}

function create(slack_controller, slack_formatter, settings_controller, player_controller, blacklist_controller, spotify_auth_controller){
    return new trackController(slack_controller, slack_formatter, settings_controller, player_controller, blacklist_controller, spotify_auth_controller);
}


module.exports = {
    create
}