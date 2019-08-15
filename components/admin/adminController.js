const admin_service = require('./adminService');
const logger = require('../../log/winston');

function initAdmin(req, res) {
    try {
        admin_service.initAdmin(req.body.user_name, req.body.response_url);
    } catch (error) {
        logger.error(`Set admin failed`, error);
    }
}

function setAdmin(req, res) {
    try {
        logger.info(`Setting admin`);
        admin_service.setAdmin(req.body.user_name);
    } catch (error) {
        logger.error(`Set admin failed`, error);
    }
}

async function isAdmin(req, res, next) {
    try {
        if (await admin_service.isAdmin(req.body.user_name, req.body.response_url)){
            next();
        }
    } catch (error) {
        logger.error(`Failed to check for admin.`, error);
    }
}

module.exports = {
    initAdmin,
    isAdmin,
    setAdmin
}