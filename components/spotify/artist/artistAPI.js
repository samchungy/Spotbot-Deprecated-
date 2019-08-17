const spotify_api = require('../auth/spotifyAuthAPI').spotifyApi
const logger = require('../../../log/winston');

async function getArtists(query){
    try {
        return await spotify_api.searchArtists(query);
    } catch (error) {
        logger.error(`Spotify API: Get Artists failed.`, error);
    }
}

module.exports = {
    getArtists
}