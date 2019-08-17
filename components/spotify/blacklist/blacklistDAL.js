const CONSTANTS = require('../../../constants');
const tracks = require('../../../db/tracks');

function getBlacklist(uri){
    return tracks.getBlacklist(uri);
}

function getAllBlacklists(){
    return tracks.getAllBlacklists();
}

function createBlacklist(uri, name, artist){
    let blacklist = {
        uri: uri,
        name: name,
        artist: artist
    }
    tracks.createBlacklist(blacklist);
}

function deleteBlacklist(blacklist){
    tracks.deleteBlacklist(blacklist);
}

module.exports = {
    createBlacklist,
    getAllBlacklists,
    getBlacklist,
    deleteBlacklist
}