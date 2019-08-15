const settings_service = require('./settingsService');
const settings_dal = require('./settingsDAL');
const slack_controller = require('../slack/slackController');
const logger = require('../../log/winston');

async function settings (req, res) {
    try {
        await settings_service.settings(req.body.trigger_id);
    } catch (error) {
        logger.error(`Settings failed`, error);
    }
}

async function getOptions(req, res) {
    try {
        res.send(await settings_service.getDeviceOptions());
    } catch (error) {
        logger.error(`Getting options failed`, error);
    }
}

async function verifySettings(req, res, payload) {
    try {
        let errors = await settings_service.verifySettings(payload.submission, payload.response_url, res);
        if (!errors){
            res.send();
        } else {
            res.send({errors});
        }
    } catch (error) {
        logger.error(`Verify settings failed `, error);
    }
}

function isInChannel(req, res, next){
    var channel = getChannel();
    if (channel != req.body.channel_id){
        res.send();
        slack_controller.reply(`:no_entry: Spotbot commands are restricted to <#${channel}>`, null, req.body.response_url);
    } else {
        next();
    }
}

function getChannel(){
    return settings_dal.getChannel();
}

function getDefaultDevice(){
    return settings_service.getDefaultDevice();
}

function getPlaylistId(){
    return settings_dal.getPlaylistId();
}

function getPlaylistName(){
    return settings_dal.getPlaylistName();
}

function getPlaylistLink(){
    return settings_dal.getPlaylistLink();
}

function getDisableRepeatsDuration(){
    return settings_dal.getDisableRepeatsDuration();
}

function getBackToPlaylist(){
    return settings_dal.getBackToPlaylist();
}

module.exports = {
    isInChannel,
    getBackToPlaylist,
    getChannel,
    getDefaultDevice,
    getDisableRepeatsDuration,
    getOptions,
    getPlaylistId,
    getPlaylistName,
    getPlaylistLink,
    settings,
    verifySettings
}