const adminService = require('./adminService');
const logger = require('../../log/winston');

class adminController {
    constructor(slack_controller){
        this.admin_service = adminService.create(slack_controller);
    }
    
    initAdmin(req, res) {
        try {
            this.admin_service.initAdmin(req.body.user_name, req.body.response_url);
        } catch (error) {
            logger.error(`Set admin failed`, error);
        }
    }
    
    setAdmin(req, res) {
        try {
            logger.info(`Setting admin`);
            this.admin_service.setAdmin(req.body.user_name);
        } catch (error) {
            logger.error(`Set admin failed`, error);
        }
    }
    
    async isAdmin(req, res, next) {
        try {
            if (await this.admin_service.isAdmin(req.body.user_name, req.body.response_url)){
                next();
            } else {
                res.send();
            }
        } catch (error) {
            logger.error(`Failed to check for admin.`, error);
        }
    }
    
    isAdminHelp(user){
        try {
            return this.admin_service.isAdminHelp(user);
        } catch (error) {
            logger.error("Check for is admin help failed - ", error);
        }
    }
    
    async adminMenu (req, res, array){
        try {
            if (array[1] == "add") {
                this.admin_service.addAdmin(array[2], req.body.response_url);
            } else if (array[1] == "remove") {
                this.admin_service.removeAdmin(array[2], req.body.user_name, req.body.response_url);
            } else if (array[1] == "list") {
                this.admin_service.listAdmins(req.body.response_url);
            }
        } catch (error) {
            logger.error("Failed to run the admin command", error);
        }
    }
}

function create(slack_controller){
    return new adminController(slack_controller);
}

module.exports = {
    create
}