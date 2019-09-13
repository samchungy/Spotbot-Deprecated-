const _ = require('lodash');
const schedule = require('node-schedule');
const moment = require('moment');
const player_api = require('./playerAPI');
const player_dal = require('./playerDAL');
const logger = require('../../../log/winston');
const CONSTANTS = require('../../../constants');

class playerService {
    constructor(slack_controller, slack_formatter, settings_controller) {
        this.slack_controller = slack_controller;
        this.slack_formatter = slack_formatter;
        this.settings_controller = settings_controller;
    }
    /**
     * Hits play on Spotify
     */
    async play(response_url) {
        var playlist_id = this.settings_controller.getPlaylistId();
        try {
            // Find our current playback state
            let player_info = await player_api.getPlaybackState();
            if (_.get(player_info, 'body.is_playing') && _.get(player_info, 'body.item')) {
                await this.slack_controller.inChannelReply(":information_source: Spotify is already playing.", null, response_url);
                return;
            }
            // Try regular play method
            if (_.get(player_info, 'body.device')) {
                if (!(_.get(player_info, 'body.is_playing'))){
                    await player_api.play();
                }
                player_info = await player_api.getPlaybackState();
                if (_.get(player_info, 'body.is_playing')) {
                    if (_.get(player_info, 'body.item')){
                        await this.slack_controller.inChannelReply(":arrow_forward: Spotify is now playing.", null, response_url);
                        return;
                    } else {
                        let playlist = await player_api.getPlaylist(playlist_id);
                        if (_.get(playlist,"body.tracks.total") == 0){
                            await this.slack_controller.inChannelReply(":confused: The playlist has no tracks, please add a track", null, response_url);
                            return;
                        } else {
                            await player_api.playPlaylist(playlist_id);
                            await this.slack_controller.inChannelReply(":arrow_forward: Spotify is now playing.", null, response_url);
                            return;
                        }
                    }
                }
            }

            // Try spotify transfer to device workaround
            logger.info("Trying Spotify transfer playback workaround");
            let device_list = await player_api.getDevices();
            if (_.get(device_list, 'body.devices.length') == 0) {
                await this.slack_controller.inChannelReply(":information_source: Your Spotify device is currently closed.", null, response_url);
                return;
            }
            const default_device = this.settings_controller.getDefaultDevice();
            let device = _.find(device_list.body.devices, {
                id: default_device
            });
            if (device) {
                await player_api.transferPlayback(device.id);
                player_info = await player_api.getPlaybackState();
                if (_.get(player_info, 'body.is_playing')) {
                    if (_.get(player_info, 'body.item')){
                        await this.slack_controller.inChannelReply(":arrow_forward: Spotify is now playing.", null, response_url);
                        return;
                    } else {
                        let playlist = await player_api.getPlaylist(playlist_id);
                        if (_.get(playlist,"body.tracks.total") == 0){
                            await this.slack_controller.inChannelReply(":confused: The playlist has no tracks, please add a track", null, response_url);
                            return;
                        } else {
                            await player_api.playPlaylist(playlist_id);
                            await this.slack_controller.inChannelReply(":arrow_forward: Spotify is now playing.", null, response_url);
                            return;
                        }
                    }
                }
                return;
            }
        } catch (error) {
            logger.error(`Spotify failed to play`, error);
        }
        await this.slack_controller.inChannelReply(":arrow_forward: Spotify failed to play.", null, response_url);
        return;
    }

    /**
     * Hits pause on Spotify
     */
    async pause(response_url) {
        try {
            // Check player state
            let player_info = await player_api.getPlaybackState();
            if (_.get(player_info, 'body.is_playing') == false) {
                await this.slack_controller.inChannelReply(":information_source: Spotify is already paused.", null, response_url);
                return;
            }
            // Try regular pause method
            if (_.get(player_info, 'body.device')) {
                await player_api.pause();
                await this.slack_controller.inChannelReply(":arrow_forward: Spotify is now paused.", null, response_url);
                return;
            }
            // Check device status workaround
            logger.info("Checking device status");
            let device_list = await player_api.getDevices();
            if (_.get(device_list, 'body.devices.length') > 0) {
                await this.slack_controller.inChannelReply(":information_source: Spotify is already paused.", null, response_url);
                return;
            } else {
                await this.slack_controller.inChannelReply(":information_source: Your Spotify device is currently closed.", null, response_url);
                return;
            }
        } catch (error) {
            logger.error(`Spotify failed to pause`, error);
        }
        await this.slack_controller.inChannelReply(":warning: Spotify failed to pause.", null, response_url);
        return;

    }

    async getCurrentTrack(response_url) {
        try {
            let playlist_id = this.settings_controller.getPlaylistId();
            let current_track = await player_api.getPlayingTrack();
            if (!(_.get(current_track, "body.item")) || current_track.statusCode == 204) {
                await this.slack_controller.inChannelReply(":information_source: Spotify is currently not playing", null, response_url);
                return;
            }
            if (this.onPlaylist(current_track.body.context, playlist_id)) {
                await this.slack_controller.inChannelReply(`:loud_sound: *Now Playing:* ${current_track.body.item.artists[0].name} - ${current_track.body.item.name}${current_track.body.item.explicit ? " (Explicit)" : ""} from the Spotify playlist`, null, response_url);
                return;
            } else {
                await this.slack_controller.inChannelReply(`:loud_sound: *Now Playing:* ${current_track.body.item.artists[0].name} - ${current_track.body.item.name}${current_track.body.item.explicit ? " (Explicit)" : ""}`, null, response_url);
                return;
            }
        } catch (error) {
            logger.error(`Get current track failed`, error);
            throw Error(error);
        }

    }


    async getCurrentPlaylist(response_url) {
        try {
            var current_playlist = this.settings_controller.getPlaylistName();
            var playlist_link = this.settings_controller.getPlaylistLink();
            await this.slack_controller.inChannelReply(`:notes: Currently playing from Spotify playlist: <${playlist_link}|${current_playlist}>`, null, response_url);
            return;
        } catch (error) {
            logger.error(`Get current playlist failed`, error);
            throw Error(error);
        }

    }


    onPlaylist(context, playlist_id) {
        var regex = /[^:]+$/;
        var found;
        return !(context == null || (context.uri &&
            (found = context.uri.match(regex)) && found[0] != playlist_id));

    }


    async voteToSkip(slack_user, track_uri, response_url) {
        try {
            var skip_votes = this.settings_controller.getSkipVotes();
            var channel_id = this.settings_controller.getChannel();

            var skip = player_dal.getSkip();
            let current_track = await player_api.getPlayingTrack();
            if (skip == null || skip.uri != track_uri || _.get(current_track, 'body.item.uri') != skip.uri) {
                await this.slack_controller.inChannelReply(":information_source: This vote has expired.", null, response_url);
                return;
            }
            if (skip.users.includes(slack_user.id)) {
                await this.slack_controller.postEphemeral(channel_id, slack_user.id, ":face_with_raised_eyebrow: You have already voted on this. ");
                return;
            } else {
                skip.users.push(slack_user.id);
                var user_text = "";
                for (let user of skip.users) {
                    user_text += `<@${user}> `;
                }
                player_dal.updateSkip(skip.uri, skip.name, skip.artist, skip.users);
                let total_votes = parseInt(skip_votes) + 1;
                if (total_votes == skip.users.length) {
                    await player_api.skip();
                    await this.slack_controller.deleteReply(`:black_right_pointing_double_triangle_with_vertical_bar: ${skip.artist} - ${skip.name} was skipped by: ${user_text}`, null, response_url);
                    return;
                }
                let votephrase = "votes";
                let num_votes_needed = total_votes - skip.users.length;
                if (num_votes_needed == 1) {
                    votephrase = "vote";
                }
                await this.slack_controller.replaceReply(`:black_right_pointing_double_triangle_with_vertical_bar: <@${skip.users[0]}> has requested to skip ${skip.artist} - ${skip.name}.`,
                    [new this.slack_formatter.footer_attachment(`Votes: ${user_text}`, `Votes: ${user_text}`, current_track.body.item.uri, "Skip", null, CONSTANTS.SLACK.PAYLOAD.SKIP_VOTE, CONSTANTS.SLACK.PAYLOAD.SKIP_VOTE, `${num_votes_needed} more ${votephrase} needed.`).json], response_url);
                return;

            }
        } catch (error) {
            logger.error(`Vote to skip failed`, error)
        }
    }

    async startVoteToSkip(slack_user, response_url) {
        try {
            var skip_votes = this.settings_controller.getSkipVotes();
            var skip_votes_after_hours = this.settings_controller.getSkipVotesAfterHours();
            var skip_track = player_dal.getSkip();

            let current_track = await player_api.getPlayingTrack();
            if (current_track.statusCode == 204) {
                await this.slack_controller.inChannelReply(":information_source: Spotify is currently not playing.", null, response_url);
                return;
            } else {
                // Store Skip Info Somewhere
                if (skip_track == null) {
                    player_dal.createSkip();
                    skip_track = player_dal.getSkip();
                }
                if (skip_track.uri == current_track.body.item.uri) {
                    await this.slack_controller.reply(":information_source: There is already a vote to skip this song.", null, response_url);
                    return;
                }
                if (moment().isBefore(moment('6:00', 'hh:mm')) || moment().isAfter(moment('18:00', 'hh:mm'))){
                    skip_votes = skip_votes_after_hours;
                }
                if (skip_votes == 0) {
                    await player_api.skip();
                    await this.slack_controller.deleteReply(`:black_right_pointing_double_triangle_with_vertical_bar: ${current_track.body.item.artists[0].name} - ${current_track.body.item.name} was skipped by: <@${slack_user}>`, null, response_url);
                    return;
                }
                player_dal.updateSkip(current_track.body.item.uri, current_track.body.item.name, current_track.body.item.artists[0].name, [slack_user]);
                let votephrase = "votes";
                let num_votes_needed = parseInt(skip_votes);
                if (num_votes_needed == 1) {
                    votephrase = "vote";
                }
                await this.slack_controller.inChannelReply(`:black_right_pointing_double_triangle_with_vertical_bar: <@${slack_user}> has requested to skip ${current_track.body.item.artists[0].name} - ${current_track.body.item.name}. `,
                    [new this.slack_formatter.footer_attachment(`Votes: <@${slack_user}>`, `Votes: <@${slack_user}>`, current_track.body.item.uri, "Skip", null, CONSTANTS.SLACK.PAYLOAD.SKIP_VOTE, CONSTANTS.SLACK.PAYLOAD.SKIP_VOTE, `${num_votes_needed} more ${votephrase} needed.`).json], response_url);
                return;
            }
        } catch (error) {
            logger.error(`Spotify failed to skip`, error);
        }
        await this.slack_controller.reply(":slightly_frowning_face: Failed to process skip command", null, response_url);
    }

    async startReset(response_url) {
        try {
            await this.slack_controller.reply(`:rotating_light: Are you sure you want to clear the playlist?`,
                [new this.slack_formatter.buttonAttachment("",
                    ":rotating_light: Are you sure you want to clear the playlist?", CONSTANTS.SLACK.PAYLOAD.RESET, "Yes I am sure",
                    CONSTANTS.SLACK.BUTTON_STYLE.DANGER, CONSTANTS.SLACK.PAYLOAD.RESET, CONSTANTS.SLACK.PAYLOAD.RESET).json], response_url);
            return;
        } catch (error) {
            logger.error("Reset request failed", error)
        }
    }

    async reset(response_url, user_id) {
        try {
            var playlist_id = this.settings_controller.getPlaylistId();
            var channel_id = this.settings_controller.getChannel();

            await player_api.reset(playlist_id);
            await this.slack_controller.reply(":rotating_light: Are you sure you want to clear the playlist?",
                [new this.slack_formatter.attachment(":boom: Done", "Done", null).json], response_url);
            await this.slack_controller.post(channel_id, `:boom: The playlist has been nuked by <@${user_id}>`);
        } catch (error) {
            logger.error("Reset confirmation failed. ", error);
        }

    }

}

function create(slack_controller, slack_formatter, settings_controller){
    return new playerService(slack_controller, slack_formatter, settings_controller);
}


module.exports = {
    create
}
