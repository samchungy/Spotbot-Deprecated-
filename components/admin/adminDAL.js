const CONSTANTS = require('../../constants');
const config = require('../../db/config');

/**
 * Get Spotbot admins
 */
function getAdmins(){
    return config.find(CONSTANTS.DB.COLLECTION.ADMIN);
}

/**
 * Set an admin for Slackbot
 * @param {string} user_name Slack User id
 */
function setAdmin(user_name){
    try {
        var admins = getAdmins();
        if (admins == null){
            config.create(CONSTANTS.DB.COLLECTION.ADMIN);
            var admins = config.find(CONSTANTS.DB.COLLECTION.ADMIN);
        }
        if (admins.users == null){
            admins.users = [user_name];
        }
        else{
            admins.users.push(user_name);
        }
        config.update(admins);
    } catch (error) {
        logger.error(`Setting admin failed`, error);
    }
}

module.exports = {
    getAdmins,
    setAdmin
}