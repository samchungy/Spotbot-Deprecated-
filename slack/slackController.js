const {slackFormatter} = require('./slackFormatter');

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