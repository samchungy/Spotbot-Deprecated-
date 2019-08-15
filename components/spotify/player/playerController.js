const player_service = require('./playerService');
const logger = require('../../../log/winston');

async function play(req, res) {
    try {
        logger.info("Play triggered");
        player_service.play(req.body.response_url);    
    } catch (error) {
        logger.error("Play spotify failed", error);
    }
}

async function pause(req, res) {
    try {
        logger.info("Pause triggered");
        player_service.pause(req.body.response_url);    
    } catch (error) {
        logger.error("Pause spotify failed", error);
    }
}

async function current(req, res){
    try {
        logger.info("Current triggered");
        if (req.body.text == "track" || req.body.text == ""){
          await player_service.getCurrentTrack(req.body.response_url);
        }
        else if (req.body.text == "playlist"){
          await player_service.getCurrentPlaylist(req.body.response_url);
        }
    } catch (error) {
        logger.error("Find current failed", error);
    }
}

function onPlaylist(context, playlist_id){
    return player_service.onPlaylist(context, playlist_id)
}


module.exports = {
    current,
    onPlaylist,
    play,
    pause
}