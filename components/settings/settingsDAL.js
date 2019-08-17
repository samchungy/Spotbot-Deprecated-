const CONSTANTS = require('../../constants');
const config = require('../../db/config');
const logger = require('../../log/winston');

function setSpotbotConfig(skip_votes, back_to_playlist, now_playing, disable_repeats_duration,
    playlist, playlist_id, playlist_link, default_device, default_device_name, channel) {
    try {
        var spotbot_config = config.find(CONSTANTS.DB.COLLECTION.CONFIG);
        if (spotbot_config == null) {
            config.create(CONSTANTS.DB.COLLECTION.CONFIG);
            return; // Initialisation of Authorisation
        }
        spotbot_config.skip_votes = skip_votes;
        spotbot_config.back_to_playlist = back_to_playlist;
        spotbot_config.now_playing = now_playing;
        spotbot_config.disable_repeats_duration = disable_repeats_duration;
        spotbot_config.playlist = playlist;
        spotbot_config.playlist_id = playlist_id;
        spotbot_config.playlist_link = playlist_link;
        spotbot_config.default_device = default_device;
        spotbot_config.default_device_name = default_device_name;
        spotbot_config.channel = channel;
        config.update(spotbot_config);
    } catch (error) {
        logger.error(`Setting spotbot config failed`, error);
    }

}

/**
 * Get the Spotify Config settings.
 */
function getSpotbotConfig(){
    return config.find(CONSTANTS.DB.COLLECTION.CONFIG);
}

function getPlaylistId(){
    return getSpotbotConfig().playlist_id;
}

function getPlaylistName(){
    return getSpotbotConfig().playlist;
}

function getPlaylistLink(){
    return getSpotbotConfig().playlist_link;
}

function getDisableRepeatsDuration(){
    return getSpotbotConfig().disable_repeats_duration;
}

function getBackToPlaylist(){
    return getSpotbotConfig().back_to_playlist;
}

function getChannel(){
    return getSpotbotConfig().channel;
}

function getSkipVotes(){
    return getSpotbotConfig().skip_votes;
}

function getNowPlaying(){
    return getSpotbotConfig().now_playing;
}

module.exports = {
    getBackToPlaylist,
    getChannel,
    getDisableRepeatsDuration,
    getNowPlaying,
    getPlaylistId,
    getPlaylistLink,
    getPlaylistName,
    getSkipVotes,
    getSpotbotConfig,
    setSpotbotConfig
};