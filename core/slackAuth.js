const crypto = require('crypto');
const qs = require('qs');
const moment = require('moment');
const config = require('../db/config');
const slack = require('../controllers/slackController');
// fetch this from environment variables
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;

function signVerification (req, res, next) {
   let slackSignature = req.headers['x-slack-signature'];
   let requestBody = qs.stringify(req.body, {format : 'RFC1738'});
   let timestamp = req.headers['x-slack-request-timestamp'];
   if (Math.abs(moment().unix()-timestamp) > 60 * 5){
    return res.status(400).send('Ignore this request.');
  }
   if (!slackSigningSecret) {
      return res.status(400).send('Slack signing secret is empty.');
   }
   let sigBasestring = 'v0:' + timestamp + ':' + requestBody;
   let mySignature = 'v0=' + 
                  crypto.createHmac('sha256', slackSigningSecret)
                        .update(sigBasestring, 'utf8')
                        .digest('hex');
   if (crypto.timingSafeEqual(
              Buffer.from(mySignature, 'utf8'),
              Buffer.from(slackSignature, 'utf8'))
      ) {
          next();
   } else {
          return res.status(400).send('Verification failed');
   }
}

function isAdmin(req, res, next){
    var admins = config.getAdmins();
    if (admins == null || admins.users.length == 0 || admins.users.includes(req.body.user_name)){
        next();
    }
    else{
        slack.sendEphemeralReply("You are not permitted to run this command.", null, req.body.response_url);
        res.send();
    }
}

module.exports = {
    isAdmin,
    signVerification
}