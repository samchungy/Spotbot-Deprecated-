const logger = require('../../../log/winston');
const CONSTANTS = require('../../../constants');
const tracks = require('../../../db/tracks');

function getSkip(){
    return tracks.getOther(CONSTANTS.DB.COLLECTION.SKIP);
}

function createSkip(uri, name, artist, users){
    skip_track = getSkip();
    if (skip_track == null){
        tracks.createOther(CONSTANTS.DB.COLLECTION.SKIP);
        return;
    }
    skip_track.uri = uri;
    skip_track.name = name;
    skip_track.artist = artist;
    skip_track.users = users;

    tracks.updateOther(skip_track);
}

function updateSkip(skip_object){
    tracks.updateOther(skip_object);
}



module.exports = {
    createSkip,
    getSkip,
    updateSkip
}