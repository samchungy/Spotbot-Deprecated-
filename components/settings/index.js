const settings_dal = require('./settingsDAL');
const settings = require('./settingsService');
const logger = require('../../log/winston');

class settingsController {
    constructor(slack_controller, slack_formatter, admin_controller, spotify_auth_controller){
        this.slack_controller = slack_controller;
        this.settings_service = settings.create(slack_controller, slack_formatter, admin_controller, spotify_auth_controller);
    }

    async settings (req, res) {
        try {
            await this.settings_service.settings(req.body.trigger_id);
        } catch (error) {
            logger.error(`Settings failed`, error);
        }
    }
    
    async getOptions(req, res) {
        try {
            res.send(await this.settings_service.getDeviceOptions());
        } catch (error) {
            logger.error(`Getting options failed`, error);
        }
    }
    
    async verifySettings(req, res, payload) {
        try {
            let errors = await this.settings_service.verifySettings(payload.submission, payload.response_url, res);
            if (!errors){
                res.send();
            } else {
                res.send({errors});
            }
        } catch (error) {
            logger.error(`Verify settings failed `, error);
        }
    }
    
    isInChannel(req, res, next){
        var channel = this.getChannel();
        if (channel != req.body.channel_id){
            res.send();
            this.slack_controller.reply(`:no_entry: Spotbot commands are restricted to <#${channel}>`, null, req.body.response_url);
        } else {
            next();
        }
    }
    
    isSettingsSet(req, res, next) {
        if (req.baseUrl == '/settings' && (req.body.text == "settings" || req.body.text == "auth")){
            next(); // To get to the settings
        }
        else if (settings_dal.getSpotbotConfig() == null) {
            res.send();
            this.slack_controller.reply(":warning: Run `/spotbot settings` to setup Spotbot", null, req.body.response_url);
        } else {
            next();
        }
    }
    
    async initialiseSettings(){
        try {
            await this.settings_service.initialise();
        } catch (error) {
            logger.error("Intialising settings failed - ", error);
        }
    }
    
    async help(req, res, next){
        try {
            if (req.body.text == "" || req.body.text == "help"){
                res.send();
                await this.settings_service.help(req.body.user_name, req.body.response_url);
            } else {
                next();
            }
        } catch (error) {
            logger.error("help failed - ", error);
        }
    }
    
    getChannel(){
        return settings_dal.getChannel();
    }
    
    getDefaultDevice(){
        return settings_dal.getDefaultDevice();
    }
    
    getPlaylistId(){
        return settings_dal.getPlaylistId();
    }
    
    getPlaylistName(){
        return settings_dal.getPlaylistName();
    }
    
    getPlaylistLink(){
        return settings_dal.getPlaylistLink();
    }
    
    getDisableRepeatsDuration(){
        return settings_dal.getDisableRepeatsDuration();
    }
    
    getBackToPlaylist(){
        return settings_dal.getBackToPlaylist();
    }
    
    getSkipVotes(){
        return settings_dal.getSkipVotes();
    }
    
}

function create(slack_controller, slack_formatter, admin_controller, spotify_auth_controller){
    return new settingsController(slack_controller, slack_formatter, admin_controller, spotify_auth_controller);
}

module.exports = { create }