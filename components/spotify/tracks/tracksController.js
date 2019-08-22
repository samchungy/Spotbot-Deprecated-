// const spotifyController = require('..spotifyController');
const tracks_service = require('./tracksService');
const slack_controller = require('../../slack/slackController');
const CONSTANTS = require('../../../constants');
const logger = require('../../../log/winston');

async function find(req, res){
    try {
        await tracks_service.find(req.body.text, req.body.trigger_id, req.body.response_url);
    } catch (error) {
        logger.error(`Finding song failed`, error);
    }
}

async function findPop(req, res){
    try {
        await tracks_service.findPop(req.body.text, req.body.trigger_id, req.body.response_url);
    } catch (error) {
        logger.error(`Finding song failed`, error);
    }
}

async function findArtistTracks(text, trigger_id, response_url){
    try {
        await tracks_service.find(text, trigger_id, response_url);
    } catch (error) {
        logger.error(`Finding song failed`, error);
    }
}

function deleteOrAckReply(req, res, name){
    if (CONSTANTS.SLACK.PAYLOAD.DELETABLE.includes(name)){
        slack_controller.deleteAndAck(req, res);
    } else {
        res.send();
    }
}

async function seeMoreTracks(payload){
    try {
        await tracks_service.getThreeTracks(payload.callback_id, payload.actions[0].value, payload.response_url);
    } catch (error) {
        logger.error("See more tracks failed", error);
    }
}

async function addTrack(payload){
    try {
        await tracks_service.addTrack(payload.callback_id, payload.actions[0].value, payload.user.id);
    } catch (error) {
        logger.error("Add track failed", error);
    }
}

async function whom(req, res){
    try {
        logger.info("Whom triggered");
        await tracks_service.whom(req.body.response_url);
    } catch (error) {
        logger.error("Whom failed", error);
    }
}

async function initialiseClear(req, res){
    try {
        await tracks_service.initaliseSearchClear();
    } catch (error) {
        logger.error("Initialise clear failed - ", error);
    }
}

async function cancelSearch(payload){
    try {
        await tracks_service.cancelSearch(payload.callback_id, payload.response_url);
    } catch (error) {
        logger.error("Cancelling search failed - ", error);
    }
}

module.exports = {
    addTrack,
    cancelSearch,
    deleteOrAckReply,
    find,
    findPop,
    findArtistTracks,
    initialiseClear,
    seeMoreTracks,
    whom
}