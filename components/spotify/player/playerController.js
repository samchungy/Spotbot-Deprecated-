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

module.exports = {
    play,
    pause
}