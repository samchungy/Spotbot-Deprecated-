const logger = require('../../../log/winston');
const artist = require('./artistService');

class artistController {
    constructor(slack_controller, slack_formatter, track_controller){
        this.artist_service = artist.create(slack_controller, slack_formatter, track_controller);
        this.track_controller = track_controller;
    }
    async findArtist(req, res){
        try {
            await this.artist_service.findArtist(req.body.text, req.body.trigger_id, req.body.response_url);
        } catch (error) {
            logger.error(`Finding artist failed`, error);
        }
    }
    
    async seeMoreArtists(payload){
        try {
            await this.artist_service.getThreeArtists(payload.callback_id, payload.actions[0].value, payload.response_url);
        } catch (error) {
            logger.error(`See more artists failed`, error);
        }
    }
    
    async viewArtist(payload){
        try {
            this.artist_service.deleteArtist(payload.callback_id);
            await this.track_controller.findArtistTracks(payload.actions[0].value, payload.callback_id,  payload.response_url, false);
        } catch (error) {
            logger.error("View artist failed - ", error);
        }
    }
    
}

function create(slack_controller, slack_formatter, track_controller){
    return new artistController(slack_controller, slack_formatter, track_controller);
}

module.exports = {
    create
}