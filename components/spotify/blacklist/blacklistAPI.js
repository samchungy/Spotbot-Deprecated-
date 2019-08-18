const spotify_api = require('../../spotify/auth/spotifyAuthAPI').spotifyApi
const {getPlayingTrack, skip} = require('../player/playerAPI');

module.exports = {
    getPlayingTrack,
    skip
}