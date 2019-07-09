//Load Constants
const CONSTANTS = require('./constants');
//Load Spotify Node SDK
//Cron module for scheduling refresh
const loki = require('lokijs');
const spotify = require('./spotifyConfig');
const slack = require('./slackController');
var db = new loki(CONSTANTS.TRACKS_FILE, {
    autoload: true,
    autoloadCallback: initialise,
    autosave: true
});

//Load Lokijs db
const DEFAULT_DEVICE_ID = '6d2e33d004c05821b7be5da785dbc3a2c55eeca7';

function addSongToPlaylist(trigger_id, track_uri, slack_user) {
    // Add song to Spotify playlist
    var playlist = spotify.configDb.getCollection(CONSTANTS.PLAYLIST)
    // let add_result = await spotify.api.addTracksToPlaylist()

    var history = db.getCollection(CONSTANTS.HISTORY);
    var tracks = db.getCollection(CONSTANTS.TRACK);
    var search = tracks.by(CONSTANTS.TRACK_URI, track_uri);
    // Look for existing song
    if (search == null) {
        // Insert a new history record.
        var new_history = {
            slack_user: slack_user.id
        }
        new_history[CONSTANTS.TRACK_URI] = track_uri;
        history.insert(new_history);
    } else {
        // Update history record with new user
        search.slack_user = slack_user.id;
        history.update(search);
    }
    // Free up memory, remove search from tracks.
    var result = tracks.by(CONSTANTS.TRIGGER_ID, trigger_id);
    if (result == null){
        return slack.reply("in_channel", ":slightly_frowning_face: I'm sorry, your search expired. Please try another one.");
    }
    else{
        tracks.remove(result);
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
        console.log(playerinfo.body.is_playing);
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
function getThreeTracks(trigger_id) {
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
    // Get 3 tracks, store in previous tracks.
    var previous_tracks = search.tracks.splice(0, 3);
    var slack_attachments = []
    if (previous_tracks.length != 0) {
        for (let track of previous_tracks) {
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
                "callback_id": trigger_id,
                "fallback": "See more tracks",
                "actions": [{
                    "text": "See more tracks",
                    "type": "button",
                    "name": CONSTANTS.SEE_MORE_TRACKS,
                    "value": CONSTANTS.SEE_MORE_TRACKS
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
                tracks: searchresults.body.tracks.items
            }
            newtrack[CONSTANTS.TRIGGER_ID] = trigger_id
            tracks.insert(newtrack);
            return getThreeTracks(trigger_id);
        }
    } catch (error) {
        console.log("Find track on Spotify failed", error);
    }
}

module.exports = {
    play,
    pause,
    find,
    getThreeTracks,
    addSongToPlaylist
};