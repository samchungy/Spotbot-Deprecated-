const _ = require('lodash');
const moment = require('moment');
const schedule = require('node-schedule');

const logger = require('../../../log/winston');
const tracks_api = require('./tracksAPI');
const tracks_dal = require('./tracksDAL');
const CONSTANTS = require('../../../constants');

class trackService {
    constructor (slack_controller, slack_formatter, settings_controller, player_controller, blacklist_controller, spotify_auth_controller){
        this.slack_controller = slack_controller;
        this.slack_formatter = slack_formatter;
        this.settings_controller = settings_controller;
        this.player_controller = player_controller;
        this.blacklist_controller = blacklist_controller;
        this.spotify_auth_controller = spotify_auth_controller;
    }
    async find(query, trigger_id, response_url, artist) {
        try {
            if (query == ""){
                await this.slack_controller.reply("I need a search term... :face_palm:", null, response_url);
                return;
            }
    
            logger.info(`Find tracks for query "${query}" triggered.`);
            let search_results;
            let search_tracks;
            if (artist){
                search_results = await tracks_api.getSearchArtistTracks(query);
                search_tracks = _.get(search_results, 'body.tracks');
            } else{
                search_results = await tracks_api.getSearchTracks(`${query}*`);
                search_tracks = _.get(search_results, 'body.tracks.items');
            }
            if (search_tracks.length == 0) {
                //No Tracks found
                await this.slack_controller.reply(`:slightly_frowning_face: No tracks found for the search term "${query}". Try another search?`, null, response_url);
                return;
            } else {
                // Store in our db
                tracks_dal.createSearch(trigger_id, search_tracks, Math.ceil(search_tracks.length / 3));
                await this.getThreeTracks(trigger_id, 1, response_url);
                return;
            }
        } catch (error) {
            logger.error(`Spotify failed to find tracks`, error);
        }
        await this.slack_controller.reply(`:slightly_frowning_face: Finding tracks failed.`, null, response_url);
        return;
    }
    
    async findPop(query, trigger_id, response_url) {
        try {
            if (query == ""){
                await this.slack_controller.reply("I need a search term... :face_palm:", null, response_url);
                return;
            }
    
            logger.info(`Find popular tracks for query "${query}" triggered.`);
            let search_results = await tracks_api.getMaxSearchTracks(`${query}*`);
            let search_tracks = _.get(search_results, 'body.tracks.items');
            search_tracks = _.reverse(_.sortBy(search_tracks, ['popularity']));
            search_tracks = search_tracks.splice(0, 30);
            if (search_tracks.length == 0) {
                //No Tracks found
                await this.slack_controller.reply(`:slightly_frowning_face: No popular tracks found for the search term "${query}". Try another search?`, null, response_url);
                return;
            } else {
                // Store in our db
                tracks_dal.createSearch(trigger_id, search_tracks, Math.ceil(search_tracks.length / 3));
                await this.getThreeTracks(trigger_id, 1, response_url);
                return;
            }
        } catch (error) {
            logger.error(`Spotify failed to find popular tracks`, error);
        }
        await this.slack_controller.reply(`:slightly_frowning_face: Finding popular tracks failed.`, null, response_url);
        return;
    }
    
    
    /**
     * Gets up to 3 tracks from our local db
     * @param {string} trigger_id Slack trigger id
     */
    async getThreeTracks(trigger_id, page, response_url) {
        try {
            var search = tracks_dal.getSearch(trigger_id);
            // Searches expire after X time.
            if (search == null) {
                await this.slack_controller.reply(`:slightly_frowning_face: I'm sorry, your search expired. Please try another one.`, null, response_url);
                return;
            }
            // Our search has hit the end, remove it.
            if (_.get(search, 'tracks.length') == 0) {
                tracks_dal.deleteSearch(search);
                await this.slack_controller.reply(`:information_source: No more tracks. Try another search.`, null, response_url);
                return;
            }
            // Make sure it is an int.
            page = parseInt(page);
    
            // Get 3 tracks of the search
            var current_tracks = search.tracks.splice(0, 3);
            var slack_attachments = []
            for (let track of current_tracks) {
                let image = (_.get(track,"album.images[0]")) ? track.album.images[0].url : "";
                slack_attachments.push(
                    new this.slack_formatter.trackAttachment(`:studio_microphone: *Artist* ${track.artists[0].name}\n\n:cd: *Album* ${track.album.name}`, 
                        `${track.artists[0].name} - ${track.name}`, trigger_id, "Add to playlist", CONSTANTS.SLACK.BUTTON_STYLE.PRIMARY, 
                            CONSTANTS.SLACK.PAYLOAD.ADD_SONG, track.uri, image, `${track.name}${track.explicit ? " (Explicit)" : ""}`, track.external_urls.spotify).json
                );
            }
            // Update DB
            tracks_dal.updateSearch(search);
            slack_attachments.push(
                new this.slack_formatter.doubleButtonAttachment(`Page: ${page}/${search.total_pages}`, "See more tracks", trigger_id, "See more tracks", 
                    null, CONSTANTS.SLACK.PAYLOAD.SEE_MORE_TRACKS, page+1, "Cancel search", CONSTANTS.SLACK.BUTTON_STYLE.DANGER, CONSTANTS.SLACK.PAYLOAD.CANCEL_SEARCH, CONSTANTS.SLACK.PAYLOAD.CANCEL_SEARCH).json
            );
            await this.slack_controller.reply(`:mag: Are these the tracks you were looking for?`, slack_attachments, response_url);
            return;
        } catch (error) {
            logger.error(`Failed to get 3 more tracks`, error);
        }
        return;
    }
    
    /**
     * 
     * @param {string} trigger_id 
     * @param {string} track_uri 
     * @param {*} user_id 
     */
    async addTrack(trigger_id, track_uri, user_id) {
        try {
            // Add song to Spotify playlist
            var playlist_id = this.settings_controller.getPlaylistId();
            var disable_repeats_duration = this.settings_controller.getDisableRepeatsDuration();
            var back_to_playlist = this.settings_controller.getBackToPlaylist();
            var channel_id = this.settings_controller.getChannel();
    
            var track_id = track_uri.match(/[^:]+$/)[0];
            let track = await tracks_api.getTrack(track_id);
            var name = `${_.get(track, 'body.name')}${track.body.explicit ? " (Explicit)" : ""}`;
            var artist = _.get(track, 'body.artists[0].name');
            var history = tracks_dal.getHistory(track_uri);
            // Check the blacklist:
            if (this.blacklist_controller.isInBlacklist(track_uri)){
                await this.slack_controller.post(channel_id, `:no_entry: ${artist} - ${name} is blacklisted.`);
                return
            }
            // Look for existing song
            if (history == null) {
                // Insert a new history record.
                tracks_dal.createHistory(track_uri, name, artist, user_id, moment());
            } else {
                // Update history record with new user
                if (disable_repeats_duration){
                    if (await this.isRepeat(disable_repeats_duration, history.time_added)){
                        await this.slack_controller.post(channel_id, `:no_entry: ${artist} - ${name} was already added around ${moment.duration(moment().diff(history.time_added)).humanize()} ago.`);
                        return
                    }
                }
                history.user_id = user_id;
                history.time_added = moment();
                tracks_dal.updateHistory(history);
            }
            // Free up memory, remove search from tracks.
            let text = `:tada: ${artist} - ${name} was added to the playlist.`
            let current_track = await tracks_api.getPlayingTrack();
            // Get the song back on playlist
            if (back_to_playlist == "yes" && current_track.statusCode != 204 && !this.player_controller.onPlaylist(current_track.body.context, playlist_id)){
                let array;
                // Check if the song we are adding is the song currently playing.
                let cur_track = _.get(current_track, "body.item.uri");
                if (cur_track && cur_track != track_uri){
                    array = [current_track.body.item.uri, track_uri];
                } else {
                    array = [track_uri];
                }
                await this.setBackToPlaylist(playlist_id, array);
                text += " Spotify will return to the playlist after this song."
            } else{
                // Already on the playlist
                await tracks_api.addTracks(playlist_id, [track_uri]);
            }
    
            // Remove our search from our DB.
            var search = tracks_dal.getSearch(trigger_id);
            if (search != null) {
                tracks_dal.deleteSearch(search);
            }
            
            await this.slack_controller.post(channel_id, text);
            return;
        } catch (error) {
            logger.error(`Add Song to Playlist failed`, error);
        }
    }
    
    isRepeat(disable_repeats_duration, time){
        if (moment(time).add(disable_repeats_duration, 'h').isAfter(moment())){
            return true;
        }
        return false;
    }
    
    /**
     * @param {string} playlist_id
     * @param {string[]} tracks
     * @param {*} current_track Spotifyapi current track response
     */
    async setBackToPlaylist(playlist_id, tracks){
        try {
            // Remove any song that is unplayable from playlist
            let playlist = await tracks_api.getPlaylist(playlist_id);
            var num_of_searches = Math.ceil(playlist.body.tracks.total/100);
            var all_promises = [];
            for (let offset = 0; offset < num_of_searches ; offset++){
                all_promises.push(new Promise(async (resolve, reject) => {
                    let playlist_tracks = await tracks_api.getPlaylistTracks(playlist_id, offset);
                    resolve(_.get(playlist_tracks, 'body.items'));
                }));
            }
            let all_tracks = await Promise.all(all_promises);
            all_tracks = _.flatten(all_tracks);
            let tracks_to_remove = [];
            
            for (let track of all_tracks){
                if(!track.track.is_playable){
                    tracks_to_remove.push(track.track.uri)
                }
            }
            await tracks_api.removeTracks(playlist_id, tracks_to_remove);

            await tracks_api.addTracks(playlist_id, tracks);
            playlist = await tracks_api.getPlaylist(playlist_id);
            var num_of_searches = Math.ceil(_.get(playlist, 'body.tracks.total')/100);
            // Find track's last added location. We will have to search the playlist part by part from back to front.
            for (let offset = num_of_searches - 1; offset >= 0; offset--) {
                let playlist_tracks = await tracks_api.getPlaylistTracks(playlist_id, offset);
                let track_list = _.get(playlist_tracks, 'body.items');
                let index = _.findLastIndex(track_list, track => {
                    return track.track.uri == tracks[0]
                });
                if (index != -1){
                    let current_track = await tracks_api.getPlayingTrack();
                    if (current_track.statusCode != 204 && current_track.body.item == null){
                        await tracks_api.playWithContext(playlist_id, offset*100+index, 0);
                    } else {
                        await tracks_api.playWithContext(playlist_id, offset*100+index, current_track.body.progress_ms);
                        if (current_track.body.is_playing == false){
                            await tracks_api.pause();
                        }
                        return;
                    }
                }
            }
        } catch (error) {
            logger.info(`Get back to playlist failed`, error);
            throw Error(error);
        }
    }
    
    async whom(response_url) {
        try {
            var spotify_user_id = this.spotify_auth_controller.getSpotifyUserId();
            var playlist_id = this.settings_controller.getPlaylistId()
            let current_track = await tracks_api.getPlayingTrack();
            if (current_track.statusCode == 204){
                await this.slack_controller.inChannelReply(":information_source: Spotify is currently not playing.", null, response_url);
                return;
            }
            // Check if Spotify is playing from the playlist.
            if(!this.player_controller.onPlaylist(current_track.body.context, playlist_id)){
                await this.slack_controller.inChannelReply(`:information_source: Spotify is not playing from the playlist. Current Song: ${current_track.body.item.artists[0].name} - ${current_track.body.item.name}${current_track.body.item.explicit ? " (Explicit)" : ""}`, null, response_url);
                return;
    
            }
            else {
                var previous_track = tracks_dal.getHistory(current_track.body.item.uri);
                var playlist_id = this.settings_controller.getPlaylistId();
                let playlist = await tracks_api.getPlaylist(playlist_id);
                var num_of_searches = Math.ceil(playlist.body.tracks.total/100);
    
                // Find track's last added location. We will have to search the playlist part by part from back to front.
                for (let offset = num_of_searches-1; offset >=0 ; offset--){
                    let playlist_tracks = await tracks_api.getPlaylistTracks(playlist_id, offset);
                    let track_list = _.get(playlist_tracks, 'body.items');
                    let index = _.findLastIndex(track_list, track => {
                        return track.track.uri == current_track.body.item.uri
                    });
                    // Track was found
                    if (index != -1){
                        let found_track = track_list[index];
                        if (previous_track == null || found_track.added_by.id != spotify_user_id) {
                            let user_profile = await tracks_api.getUserProfile(found_track.added_by.id);
                            await this.slack_controller.inChannelReply(`:white_frowning_face: ${current_track.body.item.artists[0].name} - ${current_track.body.item.name}${current_track.body.item.explicit ? " (Explicit)" : ""} was added ${moment(found_track.added_at).fromNow()} directly to the playlist in Spotify by <${user_profile.body.external_urls.spotify}|${user_profile.body.display_name}>.`, null, response_url);
                            return;            
                        }
                        else{
                            await this.slack_controller.inChannelReply(`:microphone: ${current_track.body.item.artists[0].name} - ${current_track.body.item.name}${current_track.body.item.explicit ? " (Explicit)" : ""} was last added ${moment(previous_track.time_added).fromNow()} by <@${previous_track.user_id}>.`, null, response_url);
                            return;
                        }
                    }
                }
            }
        } catch (error) {
            logger.error(`Whom failed`, error);
        }
        return; 
    }
    
    async initaliseSearchClear(){
        try {
            logger.info("Clear searches cron job set");
            schedule.scheduleJob(CONSTANTS.CRONJOBS.SEARCH_CLEAR, '0 2 * * 1', async () => {
                try {
                    let channel_id = this.settings_controller.getChannel();
                    // Check if settings are set.
                    if (channel_id != null){
                        tracks_dal.clearSearches();
                    }
                } catch (error) {
                    logger.error(`Clear searches cron job Failed`, error);
                }
            });
        
        } catch (error) {
            logger.error("Clear searches cron job Failed - ", error);
        }
    }
    
    async cancelSearch(trigger_id, response_url) {
        try {
        // Remove our search from our DB.
        var search = tracks_dal.getSearch(trigger_id);
        if (search != null) {
            tracks_dal.deleteSearch(search);
        }
        await this.slack_controller.reply(":information_source: Search cancelled.", null, response_url);
        } catch (error) {
            logger.error("Cancel search failed", error);
        }
    }

    async removeTrack(user_id, response_url){
        try {
            var playlist_id = this.settings_controller.getPlaylistId();
            let playlist = await tracks_api.getPlaylist(playlist_id);
            var num_of_searches = Math.ceil(playlist.body.tracks.total/100);
            var all_promises = [];
            for (let offset = 0; offset < num_of_searches ; offset++){
                all_promises.push(new Promise(async (resolve, reject) => {
                    let playlist_tracks = await tracks_api.getPlaylistTracks(playlist_id, offset);
                    resolve(_.get(playlist_tracks, 'body.items'));
                }));
            }
            let all_tracks = await Promise.all(all_promises);
            all_tracks = _.flatten(all_tracks);
            let user_added = [];
            for (let track of all_tracks){
                let history = tracks_dal.getHistory(track.track.uri);
                if (history && history.user_id == user_id){
                    //User added the song
                    user_added.push(
                        new this.slack_formatter.selectOption(`${track.track.artists[0].name} - ${track.track.name}${track.track.explicit ? " (Explicit)" : ""}`, track.track.uri).json
                    );
                }
            }
            let attachment;
            if (user_added.length == 0){
                attachment = new this.slack_formatter.selectAttachment(`You have not added any songs to this playlist.`, `Playlist tracks`, CONSTANTS.SLACK.PAYLOAD.PLAYLIST_REMOVE, 
                CONSTANTS.SLACK.PAYLOAD.PLAYLIST_REMOVE, null).json;
            } else {
                attachment = new this.slack_formatter.selectAttachment("", `Remove a track`, CONSTANTS.SLACK.PAYLOAD.PLAYLIST_REMOVE, 
                    CONSTANTS.SLACK.PAYLOAD.PLAYLIST_REMOVE, user_added).json;
            }
            await this.slack_controller.reply(":interrobang: Select the song you would like to remove from the playlist", [attachment], response_url);

        } catch (error) {
            logger.error("Remove track failed", error);
        }
    }

    async removeFromPlaylist(track_uri, response_url){
        try {
            var playlist_id = this.settings_controller.getPlaylistId();
            var channel_id = this.settings_controller.getChannel();
            var track_id = track_uri.match(/[^:]+$/)[0];
            let track = await tracks_api.getTrack(track_id);
            var name = `${_.get(track, 'body.name')}${track.body.explicit ? " (Explicit)" : ""}`;
            var artist = _.get(track, 'body.artists[0].name');
            await tracks_api.removeTrack(playlist_id, track_uri);
            var attachment = new this.slack_formatter.selectAttachment(`:white_check_mark: Playlist track removed.`, `Playlist tracks`, CONSTANTS.SLACK.PAYLOAD.PLAYLIST_REMOVE,
                CONSTANTS.SLACK.PAYLOAD.PLAYLIST_REMOVE, null).json;
            await this.slack_controller.reply(":interrobang: Select the song you would like to remove from the playlist", [attachment], response_url);
            await this.slack_controller.post(channel_id, `:put_litter_in_its_place: ${artist} - ${name} was removed from the playlist.`);
        } catch (error) {
            logger.error(`Remove from blacklist failed `, error);
        }
    }
    
}

function create(slack_controller, slack_formatter, settings_controller, player_controller, blacklist_controller, spotify_auth_controller){
    return new trackService(slack_controller, slack_formatter, settings_controller, player_controller, blacklist_controller, spotify_auth_controller);
}


module.exports = {
    create
}