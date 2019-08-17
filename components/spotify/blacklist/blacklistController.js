const logger = require('../../../log/winston');
const blacklist_service = require('./blacklistService');

async function blacklistMenu (req, res, array){
    try {
        if (array[1] == "current") {
            blacklist_service.blacklistCurrent(req.body.user_id, req.body.response_url);
        } else if (array[1] == "remove") {
            blacklist_service.startBlacklistRemove(req.body.response_url);
        }
    } catch (error) {
        logger.error("Failed to run the blacklist command - ", error);
    }
}

async function removeFromBlacklist(payload){
    try {
        blacklist_service.removeFromBlacklist(payload.actions[0].selected_options[0].value, payload.response_url);
    } catch (error) {
        logger.error("Remove from Blacklist failed - ", error);
    }
}

function isInBlacklist(uri){
    return blacklist_service.isInBlacklist(uri);
}

module.exports = {
    blacklistMenu,
    isInBlacklist,
    removeFromBlacklist
}