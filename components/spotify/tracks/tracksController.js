// const spotifyController = require('..spotifyController');
const tracks_service = require('./tracksService');
const logger = require('../../../log/winston');

async function find(req, res){
    try {
        await tracks_service.find(req.body.text, req.body.trigger_id, req.body.response_url);
    } catch (error) {
        logger.error(`Finding song failed`, error);
    }

}

async function seeMoreTracks(payload){
    try {
        await tracks_service.getThreeTracks(payload.callback_id, payload.actions[0].value, payload.response_url);
    } catch (error) {
        logger.error("See more tracks failed", error);
    }
}

async function addTrack(payload){
    try {
        await tracks_service.addTrack(payload.callback_id, payload.actions[0].value, payload.user.id);
    } catch (error) {
        logger.error("Add track failed", error);
    }
}

// app.post('/find', slackAuth.signVerification, spotifyAuth.isAuthed, spotifySetup.isSettingsSet, spotifySetup.isInChannel, async (req, res) => {
//     logger.info("Find Triggered");
//     if (req.body.text == ""){
//       res.send({
//         "text": "I need a search term... :face_palm:"
//       });
//     }
//   else {
//     res.send(slack.ack());
//     await spotifyController.find(req.body.text, req.body.trigger_id, req.body.response_url);
//   }
//   });
  

module.exports = {
    addTrack,
    find,
    seeMoreTracks
}