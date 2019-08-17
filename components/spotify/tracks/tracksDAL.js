const CONSTANTS = require('../../../constants');
const tracks = require('../../../db/tracks');

function createSearch(trigger_id, track_list, total_pages){
    let search = {
        [CONSTANTS.DB.KEY.TRIGGER_ID] : trigger_id,
        tracks: track_list,
        total_pages: total_pages
    }
    tracks.createSearch(search);
};

function deleteSearch(search){
    tracks.deleteSearch(search);
}

function getSearch(trigger_id){
    return tracks.getSearch(trigger_id);
}

function updateSearch(search){
    tracks.updateSearch(search);
}

function createHistory(uri, name, artist, user_id, time_added){
    let history = {
        [CONSTANTS.DB.KEY.TRACK_URI]: uri,
        name: name,
        artist: artist,
        user_id : user_id,
        time_added: time_added
    }
    tracks.createHistory(history);
}

function getHistory(uri){
    return tracks.getHistory(uri);
}

function updateHistory(history){
    tracks.updateHistory(history);
}

function clearSearches(){
    tracks.clearSearches();
}

module.exports = {
    clearSearches,
    createHistory,
    createSearch,
    deleteSearch,
    getHistory,
    getSearch,
    updateHistory,
    updateSearch
}