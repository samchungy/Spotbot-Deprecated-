const logger = require('../../../log/winston');
const blacklistService = require('./blacklistService');

class blacklistController {
    constructor(slack_controller, slack_formatter, settings_controller){
        this.blacklist_service = blacklistService.create(slack_controller, slack_formatter, settings_controller);
    }
    async blacklistMenu (req, res, array){
        try {
            if (array[1] == "current") {
                this.blacklist_service.blacklistCurrent(req.body.user_id, req.body.response_url);
            } else if (array[1] == "remove") {
                this.blacklist_service.startBlacklistRemove(req.body.response_url);
            }
        } catch (error) {
            logger.error("Failed to run the blacklist command - ", error);
        }
    }
    
    async removeFromBlacklist(payload){
        try {
            this.blacklist_service.removeFromBlacklist(payload.actions[0].selected_options[0].value, payload.response_url);
        } catch (error) {
            logger.error("Remove from Blacklist failed - ", error);
        }
    }
    
    isInBlacklist(uri){
        return this.blacklist_service.isInBlacklist(uri);
    }
    
}

function create(slack_controller ,slack_formatter, settings_controller){
    return new blacklistController(slack_controller, slack_formatter, settings_controller);
}


module.exports = {
    create
}