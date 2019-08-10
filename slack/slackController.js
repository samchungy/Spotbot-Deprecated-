const slackFormatter = require('./slackFormatter');
const logger = require('../log/winston');

function ack(req, res, next){
    try {
        res.send(slackFormatter.ack());
        next();
    } catch (error) {
        logger.error(`Slack ack failed`);
        throw Error(error);
    }
}

module.exports = {
    ack
}