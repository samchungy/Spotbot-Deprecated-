const CONSTANTS = require('../constants');
const init = require('./init');
const {db2} = init;


function getHistory(uri){
    var history = db2.getCollection(CONSTANTS.HISTORY);
    return history.findOne( {track: uri} );
}

function getSearch(trigger_id){
    var searches = db2.getCollection(CONSTANTS.SEARCH);
    return searches.findOne( { trigger_id: trigger_id } );
}

function getSkip(){
    var skip = db2.getCollection(CONSTANTS.SKIP);
    return skip.findOne( {track: CONSTANTS.SKIP} );
}


function setHistory(uri, name, artist, user_id, time){
    var history = db2.getCollection(CONSTANTS.HISTORY);
    history.insert({
        track: uri,
        name: name,
        artist: artist,
        user_id : user_id,
        time: time
    });
}

function setSearch(trigger_id, tracks, total_pages){
    var searches = db2.getCollection(CONSTANTS.SEARCH);
    searches.insert({
        trigger_id: trigger_id,
        tracks: tracks,
        total_pages: total_pages
    });
}

function setSkip(uri, name, artist, users){
    var skip = db2.getCollection(CONSTANTS.SKIP);
    skip_track = skip.findOne({track : CONSTANTS.SKIP});
    if (skip_track == null){
        skip.insert({
            track: CONSTANTS.SKIP
        });
        console.log('inserting');
        return;
    }
    skip_track.uri = uri;
    skip_track.name = name;
    skip_track.artist = artist;
    skip_track.users = users;
    skip.update(skip_track);
}

function updateHistory(history_obj){
    var history = db2.getCollection(CONSTANTS.HISTORY);
    history.update(history_obj);
}

function updateSearch(search_obj){
    var searches = db2.getCollection(CONSTANTS.SEARCH);
    searches.update(search_obj);
}

function deleteSearch(search){
    var searches = db2.getCollection(CONSTANTS.SEARCH);
    searches.remove(search);
}

module.exports = {
    getHistory,
    getSearch,
    getSkip,
    setHistory,
    setSkip,
    setSearch,
    updateSearch,
    deleteSearch,
    updateHistory
}