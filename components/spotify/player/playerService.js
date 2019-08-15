const _ = require('lodash');

const player_api = require('./playerAPI');
const slack_controller = require('../../slack/slackController');
const settings_controller = require('../../settings/settingsController');
const logger = require('../../../log/winston');

/**
 * Hits play on Spotify
 */
async function play(response_url) {
    try {
        // Find our current playback state
        let player_info = await player_api.getPlaybackState();
        if (_.get(player_info, 'body.is_playing')) {
            await slack_controller.inChannelReply(":information_source: Spotify is already playing.", null, response_url);
            return;
        }
        // Try regular play method
        if (_.get(player_info, 'body.device')) {
            await player_api.play();
            await slack_controller.inChannelReply(":arrow_forward: Spotify is now playing.", null, response_url);
            return;
        }
        // Try spotify transfer to device workaround
        logger.info("Trying Spotify transfer playback workaround");
        let device_list = await player_api.getDevices();
        if (_.get(device_list, 'body.devices.length') == 0) {
            await slack_controller.inChannelReply(":information_source: Your Spotify device is currently closed.", null, response_url);
            return;
        }
        const default_device = settings_controller.getDefaultDevice();
        let device = _.find(device_list.body.devices, {
            id: default_device
        });
        if (device) {
            await player_api.transferPlayback(device.id);
            await slack_controller.inChannelReply(":arrow_forward: Spotify is now playing.", null, response_url);
            return;
        }
    } catch (error) {
        logger.error(`Spotify failed to play`, error);
    }
    await slack_controller.inChannelReply(":arrow_forward: Spotify failed to play.", null, response_url);
    return;
}

/**
 * Hits pause on Spotify
 */
async function pause(response_url) {
    try {
        // Check player state
        let player_info = await player_api.getPlaybackState();
        if (_.get(player_info, 'body.is_playing') == false) {
            await slack_controller.inChannelReply(":information_source: Spotify is already paused.", null, response_url);
            return;
        }
        // Try regular pause method
        if (_.get(player_info, 'body.device')) {
            await player_api.pause();
            await slack_controller.inChannelReply(":arrow_forward: Spotify is now paused.", null, response_url);
            return;
        }
        // Check device status workaround
        logger.info("Checking device status");
        let device_list = await player_api.getDevices();
        if (_.get(device_list, 'body.devices.length') > 0) {
            await slack_controller.inChannelReply(":information_source: Spotify is already paused.", null, response_url);
            return;
        } else {
            await slack_controller.inChannelReply(":information_source: Your Spotify device is currently closed.", null, response_url);
            return;
        }
    } catch (error) {
        logger.error(`Spotify failed to pause`, error);
    }
    await slack_controller.inChannelReply(":warning: Spotify failed to pause.", null, response_url);
    return;

}

async function getCurrentTrack(response_url){
    try {
        let playlist_id = settings_controller.getPlaylistId();
        let current_track = await player_api.getPlayingTrack();
        if (current_track.statusCode == 204){
            await slack_controller.reply(":information_source: Spotify is currently not playing", null, response_url);
            return;
        }
        if (onPlaylist(current_track.body.context, playlist_id)){
            await slack_controller.reply(`:loud_sound: *Now Playing:* ${current_track.body.item.artists[0].name} - ${current_track.body.item.name} from the Spotify playlist`, null, response_url);
            return;
        } else {
            await slack_controller.reply(`:loud_sound: *Now Playing:* ${current_track.body.item.artists[0].name} - ${current_track.body.item.name}`, null, response_url);
            return;
        }
    } catch (error) {
        logger.error(`Get current track failed`, error);
        throw Error(error);
    }

}


async function getCurrentPlaylist(response_url){
    try {
        var current_playlist = settings_controller.getPlaylistName();
        var playlist_link = settings_controller.getPlaylistLink();
        await slack_controller.reply(`:notes: Currently playing from Spotify playlist: <${playlist_link}|${current_playlist}>`, null, response_url); 
        return;
    } catch (error) {
        logger.error(`Get current playlist failed`, error);
        throw Error(error);
    }

}


function onPlaylist(context, playlist_id){
    var regex = /[^:]+$/;
    var found;
    return !(context == null || (context.uri && 
        (found = context.uri.match(regex)) && found[0] != playlist_id));

}

module.exports = {
    getCurrentPlaylist,
    getCurrentTrack,
    onPlaylist,
    pause,
    play
}