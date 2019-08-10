const express = require('express');
const router = express.Router();

const player_controller = require('./player/playerController');
const slack_controller = require('../slack/slackController');

// Publicly ack the commands
router.use(slack_controller.ack);
// Play, pause
router.get('/pause', player_controller.pause);
router.get('/play', player_controller.play);

module.exports = router