const express = require('express');
const router = express.Router();
const _ = require('lodash');

const PAYLOAD = require('../constants').SLACK.PAYLOAD;
const slack = require('../components/slack');
const spotify_auth = require('../components/spotify/auth');
const settings = require('../components/settings');
const admin = require('../components/admin');
const artist = require('../components/spotify/artist')
const player = require('../components/spotify/player');
const blacklist = require('../components/spotify/blacklist');
const track = require('../components/spotify/tracks');
const init = require('../db/init');

const slack_controller = slack.create();
const spotify_auth_controller = spotify_auth.create(slack_controller);
const admin_controller = admin.create(slack_controller);
const settings_controller = settings.create(slack_controller, admin_controller, spotify_auth_controller);
const blacklist_controller = blacklist.create(slack_controller, settings_controller);
const player_controller = player.create(slack_controller, settings_controller);
const tracks_controller = track.create(slack_controller, settings_controller, player_controller, blacklist_controller, spotify_auth_controller);
const artist_controller = artist.create(slack_controller, tracks_controller);
init.initialise(settings_controller, spotify_auth_controller, tracks_controller);

router.get('/settings/auth', spotify_auth_controller.getTokens.bind(spotify_auth_controller));

// Publicly ack the commands
router.use(slack_controller.isFromSlack)

router.post('/settings/options', settings_controller.getOptions.bind(settings_controller));

router.use('/settings', settings_controller.help.bind(settings_controller), spotify_auth_controller.isAuth.bind(spotify_auth_controller), admin_controller.isAdmin.bind(admin_controller), settings_controller.isSettingsSet.bind(settings_controller));

router.post('/settings', async(req, res) => {
  res.send();
  if (req.body.text == "auth"){
    await spotify_auth_controller.setupAuth(req, res);
    await admin_controller.initAdmin(req, res);
  } else if (req.body.text == "settings") {
      await settings_controller.settings(req, res);
  } else {
    let array = req.body.text.split(" ");
    if (array) {
      if (array[0] == "admin") {
        await admin_controller.adminMenu(req, res, array);
      }
      if (array[0] == "blacklist") {
        await blacklist_controller.blacklistMenu(req, res, array);
      }
    }
  }
});

router.use(spotify_auth_controller.isAuth.bind(spotify_auth_controller));

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
        } else if (payload_name == PAYLOAD.PLAYLIST_REMOVE) {
            await tracks_controller.removeFromPlaylist(payload);
        } else if (payload_name == PAYLOAD.SKIP_VOTE) {
            await player_controller.voteToSkip(payload);
        } else if (payload_name == PAYLOAD.RESET) {
            await player_controller.reset(payload);
        } else if (payload_name == PAYLOAD.CANCEL_SEARCH) {
            await tracks_controller.cancelSearch(payload);
        } 
    } else {
        if (payload.callback_id == PAYLOAD.SPOTBOT_CONFIG) {
            await settings_controller.verifySettings(req, res, payload);
        }
    }
});

router.use(settings_controller.isSettingsSet.bind(settings_controller), settings_controller.isInChannel.bind(settings_controller), slack_controller.ack.bind(slack_controller));

// Play, pause
router.post('/player/pause', player_controller.pause.bind(player_controller));
router.post('/player/play', player_controller.play.bind(player_controller));
router.post('/player/current', player_controller.current.bind(player_controller));
router.post('/player/skip', player_controller.startVoteToSkip.bind(player_controller));
router.post('/player/reset', player_controller.startReset.bind(player_controller))

router.post('/artist', artist_controller.findArtist.bind(artist_controller));
router.post('/find', tracks_controller.find.bind(tracks_controller));
router.post('/remove', tracks_controller.removeTrack.bind(tracks_controller));
router.post('/pop', tracks_controller.findPop.bind(tracks_controller));

router.post('/whom', tracks_controller.whom.bind(tracks_controller));

module.exports = router

