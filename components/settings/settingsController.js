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

function isSettingsSet(req, res, next) {
    if (req.baseUrl == '/settings' && (req.body.text == "" || req.body.text == "auth")){
        next(); // To get to the settings
    }
    else if (settings_dal.getSpotbotConfig() == null) {
        res.send();
        slack_controller.reply(":warning: Run `/spotbot settings` to setup Spotbot", null, req.body.response_url);
    } else {
        next();
    }
}

async function initialiseSettings(){
    try {
        await settings_service.initialise();
    } catch (error) {
        logger.error("Intialising settings failed - ", error);
    }
}

function getChannel(){
    return settings_dal.getChannel();
}

function getDefaultDevice(){
    return settings_dal.getDefaultDevice();
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

function getSkipVotes(){
    return settings_dal.getSkipVotes();
}

module.exports = {
    isInChannel,
    isSettingsSet,
    initialiseSettings,
    getBackToPlaylist,
    getChannel,
    getDefaultDevice,
    getDisableRepeatsDuration,
    getOptions,
    getPlaylistId,
    getPlaylistName,
    getPlaylistLink,
    getSkipVotes,
    settings,
    verifySettings
}