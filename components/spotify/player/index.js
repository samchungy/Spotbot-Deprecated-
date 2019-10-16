const player = require('./playerService');
const logger = require('../../../log/winston');

class player_controller{
    constructor(slack_controller, settings_controller){
        this.player_service = player.create(slack_controller, settings_controller);
    }
    async play(req, res) {
        try {
            logger.info("Play triggered");
            this.player_service.play(req.body.response_url);    
        } catch (error) {
            logger.error("Play spotify failed", error);
        }
    }
    
    async pause(req, res) {
        try {
            logger.info("Pause triggered");
            this.player_service.pause(req.body.response_url);    
        } catch (error) {
            logger.error("Pause spotify failed", error);
        }
    }
    
    async current(req, res){
        try {
            logger.info("Current triggered");
            if (req.body.text == "track" || req.body.text == ""){
              await this.player_service.getCurrentTrack(req.body.response_url);
            }
            else if (req.body.text == "playlist"){
              await this.player_service.getCurrentPlaylist(req.body.response_url);
            }
        } catch (error) {
            logger.error("Find current failed", error);
        }
    }
    
    async startVoteToSkip(req, res){
        try {
            logger.info("Skip vote started");
            await this.player_service.startVoteToSkip(req.body.user_id, req.body.response_url);
        } catch (error) {
            logger.error("Failed to start skip vote");
        }
    }
    
    async voteToSkip(payload){
        try {
            logger.info("Skip vote received");
            await this.player_service.voteToSkip(payload.user, payload.callback_id, payload.response_url);
        } catch (error) {
            logger.error("Failed to vote to skip", error);
        }
    }
    
    onPlaylist(context, playlist_id){
        return this.player_service.onPlaylist(context, playlist_id)
    }
    
    async startReset (req, res) {
        try {
            logger.info("Reset requested");
            await this.player_service.startReset(req.body.response_url);
        } catch (error) {
            logger.error("Failed to request reset", error);
        }
      }
    
    async reset (payload){
        try {
            logger.info("Reset Confirmed");
            await this.player_service.reset(payload.response_url, payload.user.id);
        } catch (error) {
            logger.error("Failed to reset - ", error);
        }
    }
    
    async setNowPlaying(){
        try {
            logger.info("Setting now playing cronjob");
            await this.player_service.setNowPlaying();
        } catch (error) {
            logger.error("Setting now playing cronjob failed - ", error);
        }
    }
    
    async removeNowPlaying(){
        try {
            logger.info("Setting now playing cronjob");
            await this.player_service.removeNowPlaying();
        } catch (error) {
            logger.error("Setting now playing cronjob failed - ", error);
        }
    }
    
}

function create(slack_controller, settings_controller){
    return new player_controller(slack_controller, settings_controller);
}


module.exports = {
    create
}