const spotifyController = require('../../core/spotifyController');
const logger = require('../../log/winston');

async function play(req, res) {
    logger.info("Play triggered");
    await spotifyController.play(req.body.response_url);
}

async function pause(req, res) {
    logger.info("Pause Triggered");
    await spotifyController.pause(req.body.response_url);  
}

module.exports = {
    pause,
    play
}