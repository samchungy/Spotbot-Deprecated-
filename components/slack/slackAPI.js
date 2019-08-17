const axios = require('axios');
const qs = require('querystring');
const logger = require('../../log/winston');
const CONSTANTS = require('../../constants');

async function reply(body, response_url){
    try {
        await axios.post(response_url, body);
        return;
    } catch (error) {
        logger.error(`Slack post reply failed`, error);
        throw Error(error);
    }
}
async function sendDialog(params){
    try {
        let results = await axios.post(CONSTANTS.SLACK.DIALOG.API, qs.stringify(params));
        if (results.data.ok){
            return;
        }
        logger.error(results.data.response_metadata.messages);
        throw(Error(results.data.error))

    } catch (error) {
        logger.error(`Send dialog failed`, error)
        throw Error(error);
    }
}

async function post(params){
    try {
        await axios.post(CONSTANTS.SLACK.POST.API, qs.stringify(params));
    } catch (error) {
        logger.error(`Failed to post to Slack`, error);
        throw Error(erorr);
    }
}

async function postEphemeral(params){
    try {
        await axios.post(CONSTANTS.SLACK.POST.EPHEMERAL.API, qs.stringify(params));
    } catch (error) {
        logger.error(`Failed to ephemeral post to Slack`, error);
        throw Error(erorr);
    }
}

module.exports = {
    post,
    postEphemeral,
    reply,
    sendDialog
}