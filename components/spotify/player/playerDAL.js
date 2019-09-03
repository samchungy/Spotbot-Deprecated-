const logger = require('../../../log/winston');
const CONSTANTS = require('../../../constants');
const tracks = require('../../../db/tracks');

function getSkip(){
    return tracks.getOther(CONSTANTS.DB.COLLECTION.SKIP);
}

function createSkip(){
    let skip_track = getSkip();
    if (skip_track == null){
        tracks.createOther(CONSTANTS.DB.COLLECTION.SKIP);
        return;
    }
}

function updateSkip(uri, name, artist, users){
    let skip_track = getSkip();
    skip_track.uri = uri;
    skip_track.name = name;
    skip_track.artist = artist;
    skip_track.users = users;
    tracks.updateOther(skip_track);
}

function getCurrent(){
    return tracks.getOther(CONSTANTS.DB.COLLECTION.CURRENT_TRACK);
}


module.exports = {
    createSkip,
    getCurrent,
    getSkip,
    updateSkip
}