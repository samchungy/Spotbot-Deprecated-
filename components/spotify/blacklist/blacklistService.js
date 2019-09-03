const _ = require('lodash');

const CONSTANTS = require('../../../constants');
const logger = require('../../../log/winston');
const blacklist_api = require('./blacklistAPI');
const blacklist_dal = require('./blacklistDAL');

class blacklistService {
    constructor(slack_controller, slack_formatter, settings_controller){
        this.slack_controller = slack_controller;
        this.slack_formatter = slack_formatter;
        this.settings_controller = settings_controller;
    }
    async blacklistCurrent(user_id, response_url) {
        try {
            let channel_id = this.settings_controller.getChannel();
            let current_track = await blacklist_api.getPlayingTrack();
            if (current_track.statusCode == 204) {
                await this.slack_controller.reply(":information_source: Spotify is currently not playing", null, response_url);
                return;
            }
            if (blacklist_dal.getBlacklist(current_track.body.item.uri) == null) {
                blacklist_dal.createBlacklist(current_track.body.item.uri, `${current_track.body.item.name}${current_track.body.item.explicit ? " (Explicit)" : ""}`, current_track.body.item.artists[0].name);
                await blacklist_api.skip();
                await this.slack_controller.post(channel_id, `:bangbang: ${current_track.body.item.artists[0].name} - ${current_track.body.item.name}${current_track.body.item.explicit ? " (Explicit)" : ""} was blacklisted and skipped by <@${user_id}>`);
                return;
            } else {
                await this.slack_controller.reply(`:interrobang: ${current_track.body.item.artists[0].name} - ${current_track.body.item.name}${current_track.body.item.explicit ? " (Explicit)" : ""} is already blacklisted.`, null, response_url);
                return;
            }
    
        } catch (error) {
            logger.error(`Blacklist current failed`, error);
        }
    }
    
    async startBlacklistRemove(response_url){
        try{
            let blacklists = blacklist_dal.getAllBlacklists();
            let blacklist_sorted  = _.orderBy(blacklists, ['artist'],['asc']);
            var options = [];
            for (let track of blacklist_sorted){
               options.push(
                   new this.slack_formatter.selectOption(`${track.artist} - ${track.name}`, track.uri).json
                );
            }
            if (options.length == 0){
                var attachment = new this.slack_formatter.selectAttachment(`No tracks in the blacklist`, `Blacklist tracks`, CONSTANTS.SLACK.PAYLOAD.BLACKLIST_REMOVE, 
                CONSTANTS.SLACK.PAYLOAD.BLACKLIST_REMOVE, null).json;
            } else {
                var attachment = new this.slack_formatter.selectAttachment("", `Blacklist tracks`, CONSTANTS.SLACK.PAYLOAD.BLACKLIST_REMOVE, 
                CONSTANTS.SLACK.PAYLOAD.BLACKLIST_REMOVE, options).json;
            }
            await this.slack_controller.reply(":interrobang: Select the song you would like to remove from the Blacklist", [attachment], response_url);
            return;
        } catch (error) {
            logger.error(`List blacklist failed `, error);
            console.error(error);
        }
    }
    
    async removeFromBlacklist(track_uri, response_url){
        try {
            let blacklist = blacklist_dal.getBlacklist(track_uri);
            if (blacklist != null){
                blacklist_dal.deleteBlacklist(blacklist);
                var attachment = new this.slack_formatter.selectAttachment(`:white_check_mark: Blacklist track removed.`, `Blacklist tracks`, CONSTANTS.SLACK.PAYLOAD.BLACKLIST_REMOVE, 
                CONSTANTS.SLACK.PAYLOAD.BLACKLIST_REMOVE, null).json;
                await this.slack_controller.reply(":interrobang: Select the song you would like to remove from the Blacklist", [attachment], response_url);
            } else {
                await this.slack_controller.reply("That track has already been removed.", null, response_url);
            }
        } catch (error) {
            logger.error(`Remove from blacklist failed `, error);
        }
    }
    
    isInBlacklist(uri){
        try {
            let blacklist = blacklist_dal.getBlacklist(uri);
            if (blacklist == null){
                return false;
            } else {
                return true;
            }
        } catch (error) {
            logger.error("Look for blacklist failed - ", error);
        }
    }

}

function create(slack_controller, slack_formatter, settings_controller){
    return new blacklistService(slack_controller, slack_formatter, settings_controller);
}


module.exports = {
    create
}