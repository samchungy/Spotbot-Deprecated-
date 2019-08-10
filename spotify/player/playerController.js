function play(req, res) {
    logger.info("Play triggered");
    await spotifyController.play(req.body.response_url);
}

function pause(req, res) {
    logger.info("Pause Triggered");
    await spotifyController.pause(req.body.response_url);  
}

module.exports = {
    pause,
    play
}