// @ts-check
//Load Constants
const CONSTANTS = require('../constants');
//Load Spotify Node SDK
//Cron module for scheduling refresh
const spotify = require('../core/spotifyAuth');
const {spotifyApi} = require('../controllers/spotify');
const slack = require('../slackController');
const config = require('../db/config');
const tracks = require('../db/tracks');
const moment = require('moment');

//Load Lokijs db
const DEFAULT_DEVICE_ID = '6d2e33d004c05821b7be5da785dbc3a2c55eeca7';

function isRepeat(disable_repeats_duration, time){
    if (moment(time).add(disable_repeats_duration, 'h').isAfter(moment())){
        return true;
    }
    return false;
}


async function addSongToPlaylist(trigger_id, track_uri, slack_user, channel_id) {
    // Add song to Spotify playlist
    var spotify_config = config.getSpotifyConfig();
    var playlistid = spotify_config.playlist_id;
    var regex = /[^:]+$/;
    var found = track_uri.match(regex);
    var track_id = found[0];
    var params = {
        channel: channel_id
    };
    
    try {
        let trackinfo = await spotifyApi.getTrack(track_id);
        var name = trackinfo.body.name;
        var artist = trackinfo.body.artists[0].name;
        // Look for existing song
        if (history == null) {
            // Insert a new history record.
            tracks.setHistory(track_uri, name, artist, slack_user.id, moment());
        } else {
            // Update history record with new user
            if (spotify_config.disable_repeats_duration){
                // Get number of tracks.
                let playlist = await spotifyApi.getPlaylist(spotify_config.playlist_id, {
                    fields: "tracks.total"
                });
                if (playlist.body.tracks.total){
                    var num_of_searches = Math.ceil(playlist.body.tracks.total/100);
                    // Spotify API only allows a maximum of 100 tracks, SO: we need to stagger the API calls.
                    for (let i = num_of_searches-1; i >= 0; i--){
                        let playlist_tracks = await spotifyApi.getPlaylistTracks(spotify_config.playlist_id, {
                            offset: i*100,
                            fields: "items.track.uri"
                        });
                        for (let item of playlist_tracks.body.items){
                            if (item.track.uri == track_uri && isRepeat(spotify_config.disable_repeats_duration, history.time)){
                                params.text = `:no_entry: ${artist} - ${name} was already added around ${moment.duration(moment().diff(history.time)).humanize()} ago.`;
                                return params;
                            }
                        }
                    }
                }
            }
            else{
                console.log("Not duration");
            }
            history.slack_user = slack_user.id;
            history.time = moment();
            tracks.updateHistory(history);
        }
        // Free up memory, remove search from tracks.
        
        params.text = `:tada: ${artist} - ${name} was added to the playlist.`
        let current_track = await spotifyApi.getMyCurrentPlayingTrack();
        console.log(current_track);
        // Get the song back on playlist
        if (current_track.body.items && !onPlaylist(current_track.body.context) && spotify_config.back_to_playlist && spotify_config.back_to_playlist == "yes"){
            await spotifyApi.addTracksToPlaylist(playlistid, [current_track.body.item.uri, track_uri]);
            console.log(current_track.body.progress_ms);
            await spotifyApi.play({
                context_uri: `spotify:playlist:${playlistid}`,
                offset: {uri: current_track.body.item.uri},
                position_ms: current_track.body.progress_ms
            });
            if (current_track.is_playing == false){
                await spotifyApi.pause();
            }
            params.text += ' Spotify will return to the playlist after this song.'
        }
        else{
            spotifyApi.addTracksToPlaylist(playlistid, [track_uri]);
        }
        var history = tracks.getSearch(trigger_id);
        if (history != null) {
            tracks.deleteSearch(history);
        }

        
        // if (settings.back_to_playlist && settings.back_to_playlist == "yes"){
        //     // Check the state of the device to determine if we need to put it back on playlist
        //     let playerinfo = await spotifyApi.getMyCurrentPlaybackState();
        //     if (playerinfo.body.is_playing != null) {track_uri.match(regex);
        //         var found;
        //         // player context = null means just playing random songs.
        //         // player context not on playlsit means playing something else
        //         // The single = is intentional here to strip the playlist id from URI 
        //         if (playerinfo.context != null && playerinfo.context.type == "playlist" && 
        //         (found = playerinfo.context.uri.match(regex)) && found[0] == settings.playlist_id){
        //             // Set Spotify to jump back onto the playlist after this song.
        //             params.text += ' Spotify will return to the playlist after this song.'

        //         };
        //     }
        // }
        return params
    } catch (error) {
        console.log(error);
    }
}

/**
 * Hits play on Spotify
 */
async function play() {
    try {
        let playerinfo = await spotifyApi.getMyCurrentPlaybackState();
        if (playerinfo.body.is_playing != null && playerinfo.body.is_playing) {
            return slack.reply("in_channel",":information_source: Spotify is already playing.");
        }
        if (playerinfo.body.device != null) {
            try {
                await spotifyApi.play();
                return slack.reply("in_channel", ":arrow_forward: Spotify is now playing.");
            } catch (error) {
                console.log("Regular play failed", error);
            }
        }
    } catch (error) {
        console.log("Get player info failed", error);
    }
    try {
        console.log("Trying Spotify transfer playback workaround");
        let devicelist = await spotifyApi.getMyDevices();
        if (devicelist.body.devices.length == 0) {
            return slack.reply("in_channel", ":information_source: Your Spotify device is currently closed.");
        }
        for (var device of devicelist.body.devices) {
            if (device.id === DEFAULT_DEVICE_ID) {
                try {
                    await spotifyApi.transferMyPlayback(
                        {
                            deviceIds: DEFAULT_DEVICE_ID,
                            play: true
                        }
                    );
                    return slack.reply("in_channel", ":arrow_forward: Spotify is now playing.");
                } catch (error) {
                    console.log("Transfer playback failed", error);
                }
            }
        }
    } catch (error) {
        console.log("Failed Spotify transfer playback workaround", error);
    }
    return slack.reply("in_channel", ":warning: Spotify failed to play");
}
/**
 * Hits pause on Spotify
 */
async function pause() {
    try {
        let playerinfo = await spotifyApi.getMyCurrentPlaybackState();
        console.log(playerinfo);
        if (playerinfo.body.is_playing != null) {
            if (!playerinfo.body.is_playing) {
                return slack.reply("in_channel", ":information_source: Spotify is already paused.");
            } else {
                try {
                    let playstate = await spotifyApi.pause();
                    return slack.reply("in_channel", ":double_vertical_bar: Spotify is now paused.");
                } catch (error) {
                    console.log("Pause on Spotify failed", error);
                }
            }
        } else {
            try {
                let devices = await spotifyApi.getMyDevices();
                if (devices.body.devices.length > 0) {
                    return slack.reply("in_channel", ":information_source: Spotify is already paused.");
                } else {
                    return slack.reply("in_channel", ":information_source: Your Spotify is currently closed.");
                }
            } catch (error) {
                console.log("Get device info failed", error);
            }
        }
    } catch (error) {
        console.log("Get player info failed", error);
    }
    return slack.reply("in_channel", ":warning: Spotify failed to pause");
}
/**
 * Gets up to 3 tracks from our local db
 * @param {Slack trigger id} trigger_id 
 */
function getThreeTracks(trigger_id, pagenum) {
    // Get tracks from DB
    var tracks = db.getCollection(CONSTANTS.TRACK);
    var search = tracks.by(CONSTANTS.TRIGGER_ID, trigger_id);
    if (search == null) {
        return slack.reply("ephemeral", ":slightly_frowning_face: I'm sorry, your search expired. Please try another one.");
    }
    if (search.tracks.length == 0) {
        tracks.remove(search);
        return slack.reply("ephemeral", ":information_source: No more tracks. Try another search.");
    }
    if (pagenum == null){
        pagenum = 1;
    }
    else{
        pagenum = parseInt(pagenum);
    }
    // Get 3 tracks, store in previous tracks.
    var current_tracks = search.tracks.splice(0, 3);
    var slack_attachments = []
    if (current_tracks.length != 0) {
        for (let track of current_tracks) {
            slack_attachments.push(slack.spotifyToSlackAttachment(track, trigger_id));
        }
    }
    // Update DB
    tracks.update(search);

    if (slack_attachments.length == 0) {
        return slack.reply("ephemeral", "No more tracks, try another search.");
    } else {
        // Push a see more tracks button.
        slack_attachments.push(
            {
                "text": `Page: ${pagenum}/${search.total_pages}`,
                "callback_id": trigger_id,
                "fallback": "See more tracks",
                "actions": [{
                    "text": "See more tracks",
                    "type": "button",
                    "name": CONSTANTS.SEE_MORE_TRACKS,
                    "value": pagenum+1
                }]
            });
       return slack.reply("ephemeral", "Are these the tracks you were looking for?", slack_attachments);
    }
}

/**
 * Finds songs based on a query on Spotify
 * @param {String} query Search term
 */
async function find(query, trigger_id) {
    try {
        let searchresults = await spotifyApi.searchTracks(query, {
            limit: 21
        });
        if (searchresults.body.tracks.items.length == 0) {
            //No Tracks found
            return slack.reply("ephemeral", `:slightly_frowning_face: No tracks found for the search term "${query}". Try another search?`);
        } else {
            // Store in our db
            tracks.setSearch(trigger_id, searchresults.body.tracks.items, Math.ceil(searchresults.body.tracks.items.length / 3));
            return getThreeTracks(trigger_id, null);
        }
    } catch (error) {
        console.log("Find track on Spotify failed", error);
    }
}

function onPlaylist(context){
    var regex = /[^:]+$/;
    var found;
    var spotify_config = config.getSpotifyConfig();
    return !(context == null || (context.uri && 
        (found = context.uri.match(regex)) && found[0] != spotify_config.playlist_id));

}

async function whom() {
    var spotify_config = config.getSpotifyConfig();
    var auth = config.getAuth();
    try {
        let currentsong = await spotifyApi.getMyCurrentPlayingTrack();
        console.log(currentsong);
        if (currentsong.statusCode == '204'){
            return slack.reply("in_channel", ":information_source: Spotify is currently not playing.");
        }
        //Check if Spotify is playing from the playlist.
        if(!onPlaylist(currentsong.body.context)){
            return slack.reply("in_channel", `:information_source: Spotify is not playing from the playlist. Current Song: ${currentsong.body.item.artists[0].name} - ${currentsong.body.item.name}`);
        }
        else {
            var track = tracks.getHistory(currentsong.body.item.uri);
            let playlist = await spotifyApi.getPlaylist(spotify_config.playlist_id, {
                fields: "tracks.total"
            });
            var num_of_searches = Math.ceil(playlist.body.tracks.total/100);
            for (let i = num_of_searches-1; i >=0 ; i--){
                let playlist_tracks = await spotifyApi.getPlaylistTracks(spotify_config.playlist_id, {
                    offset: i*100,
                    fields : "items(track.uri,added_by.id,added_at)"
                });
                for (let item of playlist_tracks.body.items) {
                    if (item.track.uri == currentsong.body.item.uri) {
                        if (item.added_by.id != auth.id || track == null){
                            return slack.reply("in_channel", `:white_frowning_face: ${currentsong.body.item.artists[0].name} - ${currentsong.body.item.name} was added ${moment(item.added_at).fromNow()} directly to the Spotify by ${item.added_by.id}.`);
                        }
                        else{
                            return slack.reply("in_channel", `:microphone: ${currentsong.body.item.artists[0].name} - ${currentsong.body.item.name} was last requested ${moment(track.time).fromNow()} by <@${track.slack_user}>.`);
                        }
                    }
                }
            }
        }
        console.log("made it to the end");
    } catch (error) {
        console.log(error);
    }
}

function skip_attachment(slack_users, num_votes, track_uri){
    console.log(num_votes);
    var users = "";
    var votes_word = "votes";
    console.log(slack_users);
    for (let user of slack_users){
        users += `<@${user}> `
    }
    if (num_votes == 1){
        votes_word = "vote";
    }
    var attachment = {
        "text": `Votes: ${users}`,
        "footer": `${num_votes} more ${votes_word} needed.`,
        "fallback": `Votes: ${users}`,
        "callback_id": track_uri,
        "color": "#3AA3E3",
        "attachment_type": "default",
        "actions": [
            {
                "name": CONSTANTS.SKIP,
                "text": "Skip",
                "type": "button",
                "value": "skip"
            }
        ]
    }
    return attachment;
}

async function skip(slack_user){
    var spotify_config = config.getSpotifyConfig();
    var skip_track = tracks.getSkip();
    try {
        let currentsong = await spotifyApi.getMyCurrentPlayingTrack();
        if (currentsong.statusCode == '204'){
            return slack.reply("in_channel", ":information_source: Spotify is currently not playing.");
        }
        else{
            // Store Skip Info Somewhere
            if (skip_track == null){
                tracks.setSkip();
                skip_track = tracks.getSkip();
                console.log(skip_track);
            }
            if (skip_track.uri == currentsong.body.item.uri){
                return slack.reply("ephemeral", ":information_source: There is already a vote to skip this song.");
            }
            tracks.setSkip(currentsong.body.item.uri, currentsong.body.item.name, currentsong.body.item.artists[0].name, [slack_user]);
            return slack.reply("in_channel", `:black_right_pointing_double_triangle_with_vertical_bar: <@${slack_user}> has requested to skip ${currentsong.body.item.artists[0].name} - ${currentsong.body.item.name}. `, 
            [skip_attachment([slack_user], parseInt(spotify_config.skip_votes)-1, currentsong.body.item.uri)]);
        }
    } catch (error) {
        console.log("Skip Failed", error);
    }
}

async function voteSkip(slack_user, track_uri){
    var spotify_config = config.getSpotifyConfig();
    var auth = config.getAuth();
    var skip = tracks.getSkip();
    var params = {
        channel: auth.channel_id,
        user: slack_user.id
    }
    let result = await spotifyApi.getMyCurrentPlayingTrack();
    if (skip.uri != track_uri || result.body.item.uri != skip.uri){
        return slack.reply("in_channel", "This vote has expired.");
    }
    if (skip.users.includes(slack_user.id)){
        params.text = "You have already voted on this. ";
        slack.postEphemeral(params);
        return slack.reply("in_channel", "");
    }
    else{
        skip.users.push(slack_user.id);
        if (spotify_config.skip_votes==skip.users.length){
            var users = "";
            for (let user of skip.users){
                users += `<@${user}> `;
            }
            spotifyApi.skipToNext();
            return slack.deleteReply("in_channel", `:black_right_pointing_double_triangle_with_vertical_bar: ${skip.artist} - ${skip.name} was skipped by: ${users}`);
        }
        return slack.deleteReply("in_channel", `:black_right_pointing_double_triangle_with_vertical_bar: <@${skip.users[0]}> has requested to skip ${skip.artist} - ${skip.name}.`,
         [skip_attachment(skip.users, parseInt(spotify_config.skip_votes)-skip.users.length, track_uri)]);

    }
}

async function reset(){
    var spotify_config = config.getSpotifyConfig();
    try {
        await spotifyApi.replaceTracksInPlaylist(spotify_config.playlist_id, [CONSTANTS.AFRICA]);
        await spotifyApi.removeTracksFromPlaylist(spotify_config.playlist_id, [{uri: CONSTANTS.AFRICA}]);
    } catch (error) {
        console.log(error);
    }
    return slack.reply("ephemeral", ":rotating_light: Are you sure you want to clear the playlist?",[
        {
            "fallback": ":boom: ",
            "text": ":boom: Done"
        }]);
}

async function resetRequest(){
    return slack.reply("ephemeral", ":rotating_light: Are you sure you want to clear the playlist?",[
    {
        "callback_id": CONSTANTS.RESET,
        "fallback": ":rotating_light: Are you sure you want to clear the playlist?",
        "actions": [{
            "text": "Yes I am sure.",
            "type": "button",
            "name": CONSTANTS.RESET,
            "value": CONSTANTS.RESET
        }]
    }]);
}

function test (){
    console.log('TESTY');
}


module.exports = {
    play,
    pause,
    find,
    getThreeTracks,
    addSongToPlaylist,
    whom,
    skip,
    voteSkip,
    reset,
    resetRequest,
    test
};