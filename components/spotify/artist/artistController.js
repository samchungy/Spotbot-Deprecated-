const logger = require('../../../log/winston');
const track_controller = require('../tracks/tracksController');
const artist_service = require('./artistService');

async function findArtist(req, res){
    try {
        await artist_service.findArtist(req.body.text, req.body.trigger_id, req.body.response_url);
    } catch (error) {
        logger.error(`Finding artist failed`, error);
    }
}

async function seeMoreArtists(payload){
    try {
        await artist_service.getThreeArtists(payload.callback_id, payload.actions[0].value, payload.response_url);
    } catch (error) {
        logger.error(`See more artists failed`, error);
    }
}

async function viewArtist(payload){
    try {
        artist_service.deleteArtist(payload.callback_id);
        await track_controller.findArtistTracks(payload.actions[0].value, payload.callback_id,  payload.response_url);
    } catch (error) {
        logger.error("View artist failed - ", error);
    }
}

module.exports = {
    findArtist,
    seeMoreArtists,
    viewArtist
}