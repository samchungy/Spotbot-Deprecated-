const spotify_api = require('../../spotify/auth/spotifyAuthAPI').spotifyApi
const {getPlayingTrack} = require('../player/playerAPI');

module.exports = {
    getPlayingTrack
}