const {spotifyApi} = require('../controllers/spotify');
const logger = require('../log/winston');
const CONSTANTS = require('../constants');

/**
 * 
 * @param {string} playlist_id 
 * @param {string[]} track_uris 
 */
async function addTracks(playlist_id, track_uris){
    try {
        return await spotifyApi.addTracksToPlaylist(playlist_id, track_uris);
    } catch (error) {
        logger.error(`Spotify API: Adding tracks to playlist failed. ${JSON.stringify(error)}`);
        throw Error(error);
    }
}

async function getAllPlaylists(){
    try {
        return await spotifyApi.getUserPlaylists({ limit: 50 });
    } catch (error) {
        logger.error(`Spotify API: Get all playlists failed. ${JSON.stringify(error)}`);
        throw Error(error);
    }
}

async function getDevices(){
    try {
        return device_list = await spotifyApi.getMyDevices();
    } catch (error) {
        logger.error(`Spotify API: Get devices failed. ${JSON.stringify(error)}`);
        throw Error(error);
    }
}

async function getPlaybackState(){
    try {
        return await spotifyApi.getMyCurrentPlaybackState();
    } catch (error) {
        logger.error(`Spotify API: Get playback state failed. ${JSON.stringify(error)}`);
        throw Error(error);
    }
}

async function getPlayingTrack(){
    try{
        return await spotifyApi.getMyCurrentPlayingTrack();
    } catch (error) {
        logger.error(`Spotify API: Get current playing track failed. ${JSON.stringify(error)}`);
        throw Error(error);
    }
}

async function getPlaylist(playlist_id){
    try {
        return await spotifyApi.getPlaylist(playlist_id, {
            fields: "tracks.total"
        });
    } catch (error) {
        logger.error(`Spotify API: Get playlist failed. ${JSON.stringify(error)}`);
        throw Error(error);
    }
}

async function getPlaylistTracks(playlist_id, offset){
    try{
        return await spotifyApi.getPlaylistTracks(playlist_id, {
            offset: offset*100,
            fields: "items(track.uri,added_by.id,added_at)"
        });
    } catch (error) {
        logger.error(`Spotify API: Get playlist tracks failed. ${JSON.stringify(error)}`);
        throw Error(error);
    }
}

async function getSearchTracks(query){
    try {
        return await spotifyApi.searchTracks(query, {
            limit: 21
        });
    } catch (error) {
        logger.error(`Spotify API: Get Search Tracks failed. ${JSON.stringify(error)}`);
        throw Error(error);
    }

}


async function getTrack(track_id){
    try {
        return await spotifyApi.getTrack(track_id);
    } catch (error) {
        logger.error(`Spotify API: Get track failed. ${JSON.stringify(error)}`);
        throw Error(error);
    }
}

async function pause(){
    try {
        return await spotifyApi.pause();
    } catch (error) {
        logger.error(`Spotify API: Pause failed. ${JSON.stringify(error)}`);
    }
}

async function play(){
    try {
        return await spotifyApi.play();
    } catch (error) {
        logger.error(`Spotify API: Play failed. ${JSON.stringify(error)}`);
        throw Error(error);
    }
}

async function playWithContext(playlist_id, offset, position_ms){
    try {
        await spotifyApi.play({
            context_uri: `spotify:playlist:${playlist_id}`,
            offset: {position: offset},
            position_ms: position_ms
        });
    } catch (error) {
        logger.error(`Spotify API: Play with context failed ${JSON.stringify(error)}`);
        throw Error(error);
    }
}

async function reset(playlist_id){
    try {
        // Bit of a meme here lol, enjoy.
        await spotifyApi.replaceTracksInPlaylist(playlist_id, [CONSTANTS.AFRICA]);
        await spotifyApi.removeTracksFromPlaylist(playlist_id, [{uri: CONSTANTS.AFRICA}]);
    } catch (error) {
        logger.error(`Spotify API: Reset failed. ${JSON.stringify(error)}`);
        throw Error(error);
    }
}

async function skip(){
    try {
        return await spotifyApi.skipToNext();
    } catch (error) {
        logger.error(`Spotify API: Skip failed. ${JSON.stringify(error)}`);
        throw Error(error);
    }
}

async function transferPlayback(device_id){
    try {
        return await spotifyApi.transferMyPlayback(
            {
                device_ids: [device_id],
                play: true
            }
        );
    } catch (error) {
        logger.error(`Spotify API: Play failed. ${JSON.stringify(error)}`);
        throw Error(error);
    }
}



module.exports = {
    addTracks,
    getDevices,
    getAllPlaylists,
    getPlaybackState,
    getPlayingTrack,
    getPlaylist,
    getPlaylistTracks,
    getSearchTracks,
    getTrack,
    pause,
    play,
    playWithContext,
    reset,
    skip,
    transferPlayback
}