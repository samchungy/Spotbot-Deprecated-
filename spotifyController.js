//Load Constants
const CONSTANTS = require('./constants');
//Load Spotify Node SDK
//Cron module for scheduling refresh
const loki = require('lokijs');
const spotify = require('./spotifyConfig');
const slack = require('./slackController');
const moment = require('moment');
const schedule = require('node-schedule');
var db = new loki(CONSTANTS.TRACKS_FILE, {
    autoload: true,
    autoloadCallback: initialise,
    autosave: true
});

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
    var configs = spotify.configDb.getCollection(CONSTANTS.CONFIG);
    var settings = configs.findOne( { name : CONSTANTS.SPOTIFY_CONFIG });
    var playlistid = settings.playlist_id;
    var regex = /[^:]+$/;
    var found = track_uri.match(regex);
    var track_id = found[0];
    var params = {
        channel: channel_id
    };
    
    try {
        let trackinfo = await spotify.api.getTrack(track_id);
        var history = db.getCollection(CONSTANTS.HISTORY);
        var tracks = db.getCollection(CONSTANTS.TRACK);
        var search = history.findOne( { track : track_uri} );
        var name = trackinfo.body.name;
        var artist = trackinfo.body.artists[0].name;
        // Look for existing song
        if (search == null) {
            // Insert a new history record.
            var new_history = {
                track: track_uri,
                artist: artist,
                name: name,
                slack_user: slack_user.id,
                time : moment()
            }
            history.insert(new_history);
        } else {
            // Update history record with new user
            search.slack_user = slack_user.id;
            if (settings.disable_repeats_duration){
                // Check Song is actually in the Spotify playlist and if it was added within disable_repeats_duration
                let playlist_tracks = await spotify.api.getPlaylistTracks(settings.playlist_id);
                for (let item of playlist_tracks.body.items){
                    if (item.track.uri == track_uri && isRepeat(settings.disable_repeats_duration, search.time)){
                        params.text = `:no_entry: ${artist} - ${name} was already added around ${moment.duration(moment().diff(search.time)).humanize()} ago.`;
                        return params;
                    }
                }
            }
            else{
                console.log("Not duration");
            }
            search.time = moment();
            history.update(search);
        }
        spotify.api.addTracksToPlaylist(playlistid, [track_uri]);
        // Free up memory, remove search from tracks.
        search_term = {};
        search_term[CONSTANTS.TRIGGER_ID] = trigger_id;
        var result = tracks.findOne(search_term);
        if (result != null) {
            tracks.remove(result);
        }
        
        params.text = `:tada: ${artist} - ${name} was added to the playlist.`
        // if (settings.back_to_playlist && settings.back_to_playlist == "yes"){
        //     // Check the state of the device to determine if we need to put it back on playlist
        //     let playerinfo = await spotify.api.getMyCurrentPlaybackState();
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
 * Initialise the database
 */
function initialise() {
    var tracks = db.getCollection(CONSTANTS.TRACK);
    var history = db.getCollection(CONSTANTS.HISTORY);
    if (tracks === null || tracks.count() == 0) {
        db.addCollection(CONSTANTS.TRACK, {
            unique: CONSTANTS.TRIGGER_ID
        });
    }
    if (history === null || history.count() == 0) {
        db.addCollection(CONSTANTS.HISTORY, {
            unique: CONSTANTS.TRACK_URI
        });
    }
}

/**
 * Hits play on Spotify
 */
async function play() {
    try {
        let playerinfo = await spotify.api.getMyCurrentPlaybackState();
        if (playerinfo.body.is_playing != null && playerinfo.body.is_playing) {
            return slack.reply("in_channel",":information_source: Spotify is already playing.");
        }
        if (playerinfo.body.device != null) {
            try {
                await spotify.api.play();
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
        let devicelist = await spotify.api.getMyDevices();
        if (devicelist.body.devices.length == 0) {
            return slack.reply("in_channel", ":information_source: Your Spotify device is currently closed.");
        }
        for (var device of devicelist.body.devices) {
            if (device.id === DEFAULT_DEVICE_ID) {
                try {
                    await spotify.api.transferMyPlayback(
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
        let playerinfo = await spotify.api.getMyCurrentPlaybackState();
        console.log(playerinfo);
        if (playerinfo.body.is_playing != null) {
            if (!playerinfo.body.is_playing) {
                return slack.reply("in_channel", ":information_source: Spotify is already paused.");
            } else {
                try {
                    let playstate = await spotify.api.pause();
                    return slack.reply("in_channel", ":double_vertical_bar: Spotify is now paused.");
                } catch (error) {
                    console.log("Pause on Spotify failed", error);
                }
            }
        } else {
            try {
                let devices = await spotify.api.getMyDevices();
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
        var pagenum = 1;
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
        let searchresults = await spotify.api.searchTracks(query, {
            limit: 21
        });
        if (searchresults.body.tracks.items.length == 0) {
            //No Tracks found
            return slack.reply("ephemeral", `:slightly_frowning_face: No tracks found for the search term "${query}". Try another search?`);
        } else {
            // Store in our db
            var tracks = db.getCollection(CONSTANTS.TRACK);
            var newtrack = {
                tracks: searchresults.body.tracks.items,
                total_pages: Math.ceil(searchresults.body.tracks.items.length / 3)
            }
            newtrack[CONSTANTS.TRIGGER_ID] = trigger_id
            tracks.insert(newtrack);
            return getThreeTracks(trigger_id, null);
        }
    } catch (error) {
        console.log("Find track on Spotify failed", error);
    }
}

async function whom() {
    var history = db.getCollection(CONSTANTS.HISTORY);
    var configs = spotify.configDb.getCollection(CONSTANTS.CONFIG);
    var settings = configs.findOne( {name: CONSTANTS.SPOTIFY_CONFIG });
    var regex = /[^:]+$/;
    var found;
    try {
        let currentsong = await spotify.api.getMyCurrentPlayingTrack();
        console.log(currentsong);
        if (currentsong.statusCode == '204'){
            return slack.reply("in_channel", ":information_source: Spotify is currently not playing.");
        }
        //Check if Spotify is playing from the playlist.
        if(currentsong.body.context == null || (currentsong.body.context.uri && (found = currentsong.body.context.uri.match(regex)) && found[0] != settings.playlist_id)){
            return slack.reply("in_channel", `:information_source: Spotify is not playing from the playlist. Current Song: ${currentsong.body.item.artists[0].name} - ${currentsong.body.item.name}`);
        }
        else {
            var track = history.findOne({
                track: currentsong.body.item.uri
            })
            if (track != null) {
                return slack.reply("in_channel", `:microphone: ${currentsong.body.item.artists[0].name} - ${currentsong.body.item.name} was last requested by <@${track.slack_user}>`);
            } else {
                let playlist_tracks = await spotify.api.getPlaylistTracks(settings.playlist_id);
                for (let item of playlist_tracks.body.items) {
                    if (item.track.uri == currentsong.body.item.uri) {
                        return slack.reply("in_channel", `:white_frowning_face: ${currentsong.body.item.artists[0].name} - ${currentsong.body.item.name} was added directly to the Spotify by ${item.added_by.id}`);
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
    var configs = spotify.configDb.getCollection(CONSTANTS.CONFIG);
    var settings = configs.findOne( {name: CONSTANTS.SPOTIFY_CONFIG} )
    var history = db.getCollection(CONSTANTS.HISTORY);
    var skip = history.findOne({track: CONSTANTS.SKIP});
    try {
        let currentsong = await spotify.api.getMyCurrentPlayingTrack();
        if (currentsong.statusCode == '204'){
            return slack.reply("in_channel", ":information_source: Spotify is currently not playing.");
        }
        else{
            // Store Skip Info Somewhere
            if (skip == null){
                var skipinfo = {
                    track: CONSTANTS.SKIP,
                }
                history.insert(skipinfo);
                skip = history.findOne({track: CONSTANTS.SKIP});
            }
            if (skip.uri == currentsong.body.item.uri){
                return slack.reply("ephemeral", ":information_source: There is already a vote to skip this song.");
            }
            skip.users = [slack_user];
            skip.uri = currentsong.body.item.uri;
            skip.name = currentsong.body.item.name;
            skip.artist = currentsong.body.item.artists[0].name;
            history.update(skip);
            return slack.reply("in_channel", `:black_right_pointing_double_triangle_with_vertical_bar: <@${slack_user}> has requested to skip ${currentsong.body.item.artists[0].name} - ${currentsong.body.item.name}. `, 
            [skip_attachment([slack_user], parseInt(settings.votes_skip)-1, currentsong.body.item.uri)]);
        }
    } catch (error) {
        console.log("Skip Failed", error);
    }
}

async function voteSkip(slack_user, track_uri){
    var configs = spotify.configDb.getCollection(CONSTANTS.CONFIG);
    var settings = configs.findOne( {name: CONSTANTS.SPOTIFY_CONFIG} )
    var history = db.getCollection(CONSTANTS.HISTORY);
    var auth = configs.findOne({name: CONSTANTS.AUTH});
    var skip = history.findOne({track: CONSTANTS.SKIP});
    var params = {
        channel: auth.channel_id,
        user: slack_user.id
    }
    let result = await spotify.api.getMyCurrentPlayingTrack();
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
        if (settings.votes_skip==skip.users.length){
            var users = "";
            for (let user of skip.users){
                users += `<@${user}> `;
                console.log(users);
            }
            spotify.api.skipToNext();
            return slack.deleteReply("in_channel", `:black_right_pointing_double_triangle_with_vertical_bar: ${skip.artist} - ${skip.name} was skipped by: ${users}`);
        }
        return slack.deleteReply("in_channel", `:black_right_pointing_double_triangle_with_vertical_bar: <@${skip.users[0]}> has requested to skip ${skip.artist} - ${skip.name}.`,
         [skip_attachment(skip.users, settings.votes_skip-skip.users.length, track_uri)]);

    }
}

function setNowPlaying(){
    var configs = spotify.configDb.getCollection(CONSTANTS.CONFIG);
    var settings = configs.findOne({name : CONSTANTS.SPOTIFY_CONFIG});
    if (settings != null){
        if (settings.now_playing && settings.now_playing == "yes"){
            schedule.scheduleJob(CONSTANTS.CRONJOB2, '*/5 * * * *', () => {
                console.log('Now Playing Status');
                refreshToken();
            });
        }
    }
}
function nowPlaying(){
    
}

module.exports = {
    play,
    pause,
    find,
    getThreeTracks,
    addSongToPlaylist,
    whom,
    skip,
    voteSkip
};