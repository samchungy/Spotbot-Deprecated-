const admin_dal = require('./adminDAL');
const slack_controller = require('../slack/slackController');
const logger = require('../../log/winston');

function initAdmin(user, response_url){
    try {
        var admins = admin_dal.getAdmins();
        if (admins == null){
            logger.info("Setting initial admin");
            admin_dal.setAdmin(user);
            slack_controller.reply(`:muscle: You have been set as an admin of Spotbot`, null, response_url);
        }
    } catch (error) {
        logger.error(`Fail to init admin`, error);
        throw Error(error);
    }
}

function setAdmin(user){
    try {
        admin_dal.setAdmin(user);
    } catch (error) {
        logger.error(`Fail to set admin`, error);
        throw Error(error);
    }
}

async function isAdmin(user, response_url){
    try {
        const admins = admin_dal.getAdmins();
        if (admins === null || admins.users.length === 0 || admins.users.includes(user)){
            return true;
        } else {
            await slack_controller.reply("You are not permitted to run this command.", null, response_url);
            return false;
        }
    } catch (error) {
        logger.error(`Failed to check if admin. `, error);
    }
}

module.exports = {
    initAdmin,
    isAdmin,
    setAdmin
}