const express = require('express');
const router = express.Router();
const _ = require('lodash');

const PAYLOAD = require('../../constants').SLACK.PAYLOAD;
const player_controller = require('./player/playerController');
const settings_controller = require('../settings/settingsController');
const slack_controller = require('../slack/slackController');
const spotify_auth_controller = require('./auth/spotifyAuthController');
const tracks_controller = require('./tracks/tracksController');

router.use(slack_controller.isFromSlack, spotify_auth_controller.isAuth, settings_controller.isInChannel);

router.post('/slack/actions', async (req, res) => {
    res.send();
    var payload = JSON.parse(req.body.payload);
    if (_.get(payload.actions,"length") > 0){
        let payload_name = payload.actions[0].name;
        if (payload_name == PAYLOAD.SEE_MORE_TRACKS) {
            await tracks_controller.seeMoreTracks(payload);
        } else if (payload_name == PAYLOAD.SEE_MORE_BLACKLIST) {
            await spotifyController.getThreeBlacklistTracks(payload.callback_id, payload.actions[0].value, payload.response_url);
        } else if (payload_name == PAYLOAD.SEE_MORE_ARTISTS) {
            await spotifyController.getThreeArtists(payload.callback_id, payload.actions[0].value, payload.response_url);
        } else if (payload_name == PAYLOAD.ADD_SONG) {
            // res.send(slack.deleteReply("ephemeral", ""));
            // await spotifyController.addSongToPlaylist(payload.callback_id, payload.actions[0].value, payload.user);
            await tracks_controller.addTrack(payload);
        } else if (payload_name == PAYLOAD.BLACKLIST) {
            res.send(slack.deleteReply("ephemeral", ""));
            await spotifyController.addSongToBlacklist(payload.callback_id, payload.actions[0].value, payload.user.id)      
        } else if (payload_name == PAYLOAD.BLACKLIST_REMOVE) {
            await spotifyController.removeFromBlacklist(payload.actions[0].selected_options[0].value, payload.response_url)
        }
    } else {
        if (payload.callback_id == PAYLOAD.SPOTBOT_CONFIG) {
            await settings_controller.verifySettings(req, res, payload);
        }
    }
});

router.use(slack_controller.ack);

// Play, pause
router.post('/player/pause', player_controller.pause);
router.post('/player/play', player_controller.play);
router.post('/find', tracks_controller.find)



module.exports = router