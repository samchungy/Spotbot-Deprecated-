const express = require('express');
const router = express.Router();
const _ = require('lodash');

const PAYLOAD = require('../../constants').SLACK.PAYLOAD;
const artist_controller = require('./artist/artistController');
const blacklist_controller = require('./blacklist/blacklistController');
const player_controller = require('../spotify/player/playerController');
const settings_controller = require('../settings/settingsController');
const slack_controller = require('../slack/slackController');
const spotify_auth_controller = require('./auth/spotifyAuthController');
const tracks_controller = require('./tracks/tracksController');

router.use(slack_controller.isFromSlack, spotify_auth_controller.isAuth);

router.post('/slack/actions', async (req, res) => {
    var payload = JSON.parse(req.body.payload);
    // Some actions requrie the previous reply to be deleted.
    if (_.get(payload.actions,"length") > 0){
        let payload_name = payload.actions[0].name;
        tracks_controller.deleteOrAckReply(req, res, payload_name);
        if (payload_name == PAYLOAD.SEE_MORE_TRACKS) {
            await tracks_controller.seeMoreTracks(payload);
        } else if (payload_name == PAYLOAD.SEE_MORE_ARTISTS) {
            await artist_controller.seeMoreArtists(payload);
        } else if (payload_name == PAYLOAD.ADD_SONG) {
            await tracks_controller.addTrack(payload);
        } else if (payload_name == PAYLOAD.VIEW_ARTIST){
            await artist_controller.viewArtist(payload);
        } else if (payload_name == PAYLOAD.BLACKLIST_REMOVE) {
            await blacklist_controller.removeFromBlacklist(payload);
        } else if (payload_name == PAYLOAD.SKIP_VOTE) {
            await player_controller.voteToSkip(payload);
        } else if (payload_name == PAYLOAD.RESET) {
            await player_controller.reset(payload);
        }
    } else {
        if (payload.callback_id == PAYLOAD.SPOTBOT_CONFIG) {
            await settings_controller.verifySettings(req, res, payload);
        }
    }
});

router.use(settings_controller.isInChannel, slack_controller.ack);

// Play, pause
router.post('/player/pause', player_controller.pause);
router.post('/player/play', player_controller.play);
router.post('/player/current', player_controller.current);
router.post('/player/skip', player_controller.startVoteToSkip);
router.post('/player/reset', player_controller.startReset)

router.post('/artist', artist_controller.findArtist);
router.post('/find', tracks_controller.find);

router.post('/whom', tracks_controller.whom);
module.exports = router