const admin_dal = require('./adminDAL');
const logger = require('../../log/winston');

class adminService {
    constructor(slack_controller){
        this.slack_controller = slack_controller;
    }
    initAdmin(user, response_url){
        try {
            var admins = admin_dal.getAdmins();
            if (admins == null){
                logger.info("Setting initial admin");
                admin_dal.setAdmin(user);
                this.slack_controller.reply(`:muscle: You have been set as an admin of Spotbot`, null, response_url);
            }
        } catch (error) {
            logger.error(`Fail to init admin`, error);
            throw Error(error);
        }
    }
    
    setAdmin(user){
        try {
            admin_dal.setAdmin(user);
        } catch (error) {
            logger.error(`Fail to set admin`, error);
            throw Error(error);
        }
    }
    
    async isAdmin(user, response_url){
        try {
            const admins = admin_dal.getAdmins();
            if (admins === null || admins.users.length === 0 || admins.users.includes(user)){
                return true;
            } else {
                await this.slack_controller.reply(":no_entry: You are not permitted to run this command.", null, response_url);
                return false;
            }
        } catch (error) {
            logger.error(`Failed to check if admin. `, error);
        }
    }
    
    isAdminHelp(user){
        try {
            let admins = admin_dal.getAdmins();
            if (admins == null || admins.users.length === 0 || admins.users.includes(user)){
                return true;
            }
            return false;
        } catch (error) {
            logger.error(`Failed to check if admin help`);
        }
    }
    
    
    addAdmin(slack_user, response_url){
        try {
            if (!slack_user){
                this.slack_controller.reply(`:neutral_face: No user specified. `, null, response_url);
                return;
            }
            let slack_name = slack_user.substr(1)
            var admins = admin_dal.getAdmins();
            if (admins.users.includes(slack_name)){
                this.slack_controller.reply(`:confused:  <${slack_user}> is already an admin. `, null, response_url);
                return;
            }
            this.setAdmin(slack_name);
            this.slack_controller.reply(`:white_check_mark: <${slack_user}> has been added as an admin.`, null, response_url);
            return;
        } catch (error) {
            logger.error(`Adding admin failed`, error);
            throw Error(error);
        }
    }
    
    removeAdmin(slack_user, requester, response_url){
        try {
            if (!slack_user){
                this.slack_controller.reply(`:neutral_face: No user specified.`, null, response_url);
                return;
            }
            let slack_name = slack_user.substr(1);
            if(slack_name == requester){
                this.slack_controller.reply(":thinking_face: You cannot remove yourself as an admin. Why would you tbh?", null, response_url);
                return;
            }
            var admins = admin_dal.getAdmins();
            if (admins.users.includes(slack_name)){
                admins.users.splice( admins.users.indexOf(slack_name), 1 );
                admin_dal.updateAdmins(admins);
                this.slack_controller.reply(`:white_check_mark: Successfully removed <${slack_user}> from admins.`, null, response_url);
                return;
            } else {
                this.slack_controller.reply(`:confused: <${slack_user}> is not an admin.`, null, response_url);
            }
        } catch (error) {
            logger.error(`Removing admin failed`, error);
            throw Error(error);
        }
    }
    
    listAdmins(response_url){
        try {
            var admins = admin_dal.getAdmins();
            var admin_string = "";
            for (let i of admins.users){
                admin_string += `<@${i}> `
            }
            this.slack_controller.reply(`:information_source: Current Admins: ${admin_string}`, null, response_url);
        } catch (error) {
            logger.error("List admins failed ", error)
        }
    }
    
}

function create(slack_controller){
    return new adminService(slack_controller);
}

module.exports = {
    create
}