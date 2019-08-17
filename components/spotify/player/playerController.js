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

async function startVoteToSkip(req, res){
    try {
        logger.info("Skip vote started");
        await player_service.startVoteToSkip(req.body.user_id, req.body.response_url);
    } catch (error) {
        logger.error("Failed to start skip vote");
    }
}

async function voteToSkip(payload){
    try {
        logger.info("Skip vote received");
        await player_service.voteToSkip(payload.user, payload.callback_id, payload.response_url);
    } catch (error) {
        logger.error("Failed to vote to skip", error);
    }
}

function onPlaylist(context, playlist_id){
    return player_service.onPlaylist(context, playlist_id)
}

async function startReset (req, res) {
    try {
        logger.info("Reset requested");
        await player_service.startReset(req.body.response_url);
    } catch (error) {
        logger.error("Failed to request reset", error);
    }
  }

async function reset (payload){
    try {
        logger.info("Reset Confirmed");
        await player_service.reset(payload.response_url, payload.user.id);
    } catch (error) {
        logger.error("Failed to reset", error);
    }
}

module.exports = {
    current,
    onPlaylist,
    play,
    pause,
    reset,
    startReset,
    startVoteToSkip,
    voteToSkip
}