const spotify_api = require('../../spotify/auth/spotifyAuthAPI').spotifyApi
const {pause, getPlayingTrack} = require('../player/playerAPI');
const logger = require('../../../log/winston');

/**
 * 
 * @param {string} playlist_id 
 * @param {string[]} track_uris 
 */
async function addTracks(playlist_id, track_uris){
    try {
        return await spotify_api.addTracksToPlaylist(playlist_id, track_uris);
    } catch (error) {
        logger.error(`Spotify API: Adding tracks to playlist failed.`, error);
        throw Error(error);
    }
}

async function getPlaylist(playlist_id){
    try {
        return await spotify_api.getPlaylist(playlist_id, {
            fields: "tracks.total"
        });
    } catch (error) {
        logger.error(`Spotify API: Get playlist failed.`, error);
        throw Error(error);
    }
}

async function getSearchTracks(query){
    try {
        return await spotify_api.searchTracks(query, {
            limit: 30
        });
    } catch (error) {
        logger.error(`Spotify API: Get Search Tracks failed.`, error);
        throw Error(error);
    }
}

async function getMaxSearchTracks(query){
    try {
        return await spotify_api.searchTracks(query, {
            limit: 30
        });
    } catch (error) {
        logger.error(`Spotify API: Get Search Tracks failed.`, error);
        throw Error(error);
    }
}

async function getPlaylistTracks(playlist_id, offset){
    try{
        return await spotify_api.getPlaylistTracks(playlist_id, {
            offset: offset*100,
            fields: "items(track(uri,name,artists,explicit),added_by.id,added_at)"
        });
    } catch (error) {
        logger.error(`Spotify API: Get playlist tracks failed.`, error);
        throw Error(error);
    }
}

/**
 * 
 * @param {string} playlist_id 
 * @param {string[]} track_uris 
 */
async function addTracks(playlist_id, track_uris){
    try {
        return await spotify_api.addTracksToPlaylist(playlist_id, track_uris);
    } catch (error) {
        logger.error(`Spotify API: Adding tracks to playlist failed.`, error);
        throw Error(error);
    }
}


async function playWithContext(playlist_id, offset, position_ms){
    try {
        await spotify_api.play({
            context_uri: `spotify:playlist:${playlist_id}`,
            offset: {position: offset},
            position_ms: position_ms
        });
    } catch (error) {
        logger.error(`Spotify API: Play with context failed`, error);
        throw Error(error);
    }
}

async function getTrack(track_id){
    try {
        return await spotify_api.getTrack(track_id);
    } catch (error) {
        logger.error(`Spotify API: Get track failed.`, error);
        throw Error(error);
    }
}


async function getSearchArtistTracks(id){
    try {
        return await spotify_api.getArtistTopTracks(id, "AU");
    } catch (error) {
        logger.error(`Spotify API: Get Search Artist Tracks failed.`, error);
        throw Error(error);
    }
}

async function getUserProfile(user_id){
    try {
        return await spotify_api.getUser(user_id);
    } catch (error) {
        logger.error(`Spotify API: Get User Profile failed. - `, error);
    }
}

async function removeTrack(playlist_id, track_uri) {
    try {
        await spotify_api.removeTracksFromPlaylist(playlist_id, [{
            uri: track_uri
        }]);
    } catch (error) {
        logger.error(`Spotify API: Remove track failed. - `, error);
    }
}

module.exports = {
    addTracks,
    getMaxSearchTracks,
    getPlayingTrack,
    getPlaylist,
    getPlaylistTracks,
    getSearchArtistTracks,
    getSearchTracks,
    getTrack,
    getUserProfile,
    pause,
    playWithContext,
    removeTrack
}