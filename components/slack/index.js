const crypto = require('crypto');
const qs = require('qs');
const moment = require('moment');
const SLACKSIGNINGSECRET = process.env.SLACK_SIGNING_SECRET;
const slack_formatter = require('./slackFormatter');
const slack_api = require('./slackAPI');
const logger = require('../../log/winston');

class SlackController{
    constructor(){
        this.slack_formatter = slack_formatter;
    }
    ack(req, res, next){
        try {
            res.send(this.slack_formatter.ack());
            next();
        } catch (error) {
            logger.error(`Slack ack failed`);
            throw Error(error);
        }
    }
    deleteAndAck(req, res){
        try {
            res.send(this.slack_formatter.ackDelete());
        } catch (error) {
            logger.error(`Slack ack delete failed`);
            throw Error(error);
        }
    }
    isFromSlack(req, res, next) {
        let slackSignature = req.headers['x-slack-signature'];
        let requestBody = qs.stringify(req.body, {
            format: 'RFC1738'
        });
        let timestamp = req.headers['x-slack-request-timestamp'];
        if (Math.abs(moment().unix() - timestamp) > 60 * 5) {
            return res.status(400).send('Ignore this request.');
        }
        if (!SLACKSIGNINGSECRET) {
            return res.status(400).send('Slack signing secret is empty.');
        }
        let sigBasestring = 'v0:' + timestamp + ':' + requestBody;
        let mySignature = 'v0=' +
            crypto.createHmac('sha256', SLACKSIGNINGSECRET)
            .update(sigBasestring, 'utf8')
            .digest('hex');
        if (crypto.timingSafeEqual(
                Buffer.from(mySignature, 'utf8'),
                Buffer.from(slackSignature, 'utf8'))) {
            next();
        } else {
            return res.status(400).send('Verification failed');
        }
    }
    async reply(text, attachments, response_url) {
        try {
            let message = new this.slack_formatter.reply(text, attachments).json;
            await slack_api.reply(message, response_url);
        } catch (error) {
            logger.error("Reply failed", error);
            throw Error(error);
        }
    }
    async post(channel_id, text) {
        try {
            let params = new this.slack_formatter.postParams(process.env.SLACK_TOKEN, channel_id, text).json;
            await slack_api.post(params);
        } catch (error) {
            logger.error("Post failed", error);
            throw Error(error);
        }
    }
    async postEphemeral(channel_id, user, text) {
        try {
            let params = new this.slack_formatter.postEpehemralParams(process.env.SLACK_TOKEN, channel_id, text, user).json;
            await slack_api.postEphemeral(params);
        } catch (error) {
            logger.error("Post ephemeral failed", error);
            throw Error(error);
        }
    }


    async inChannelReply(text, attachments, response_url) {
        try {
            let message = new this.slack_formatter.inChannelReply(text, attachments).json;
            await slack_api.reply(message, response_url);
        } catch (error) {
            logger.error("In Channel Reply failed", error);
            throw Error(error);
        }
    }

    async sendDialog(trigger_id, dialog) {
        try {
            let params = new this.slack_formatter.dialogParams(process.env.SLACK_TOKEN, trigger_id, dialog).json;
            await slack_api.sendDialog(params);

        } catch (error) {
            logger.error("Sending dialog failed", error);
            throw Error(error);
        }
    }

    async deleteReply(text, attachments, response_url) {
        try {
            let message = new this.slack_formatter.deleteInChannelReply(text, attachments).json;
            await slack_api.reply(message, response_url);
        } catch (error) {
            logger.error("Delete reply failed", error);
            throw Error(error);
        }
    }

    async replaceReply(text, attachments, response_url) {
        try {
            let message = new this.slack_formatter.replaceReply(text, attachments).json;
            await slack_api.reply(message, response_url);
        } catch (error) {
            logger.error("Replace reply failed", error);
            throw Error(error);
        }
    }
}

function create(){
    return new SlackController();
}

module.exports = {create};