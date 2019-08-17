const CONSTANTS = require('../constants');
const init = require('./init');
const {db2} = init;

function getSearches(){
    return db2.getCollection(CONSTANTS.DB.COLLECTION.SEARCH);
}

function createSearch(search){
    let searches = getSearches();
    searches.insert(search);
}

function getSearch(trigger_id){
    let searches = getSearches();
    return searches.findOne( {[CONSTANTS.DB.KEY.TRIGGER_ID]: trigger_id} );
}

function updateSearch(search){
    let searches = getSearches();
    searches.update(search);
}

function deleteSearch(search){
    let searches = getSearches();
    searches.remove(search);
}

function getAllHistory(){
    return db2.getCollection(CONSTANTS.DB.COLLECTION.HISTORY);
}

function createHistory(history){
    let all_history = getAllHistory();
    all_history.insert(history);
}

function getHistory(uri){
    let all_history = getAllHistory();
    return all_history.findOne({[CONSTANTS.DB.KEY.TRACK_URI]: uri});
}

function updateHistory(history){
    let all_history = getAllHistory();
    all_history.update(history);
}

function getOtherCollection(){
    return db2.getCollection(CONSTANTS.DB.COLLECTION.OTHER)
}

function createOther(name){
    let other = getOtherCollection();
    other.insert({
        [CONSTANTS.DB.KEY.TYPE]: name
    });
}

function getOther(name){
    let other = getOtherCollection();
    return other.findOne({[CONSTANTS.DB.KEY.TYPE]: name});
}

function updateOther(other_object){
    let other = getOtherCollection();
    other.update(other_object);
}

function getAllBlacklist(){
    return db2.getCollection(CONSTANTS.DB.COLLECTION.BLACKLIST);
}

function createBlacklist(blacklist){
    let blacklists = getAllBlacklist();
    blacklists.insert(blacklist);
}

function getBlacklist(uri){
    let blacklists = getAllBlacklist()
    return blacklists.findOne( {[CONSTANTS.DB.KEY.TRACK_URI]: uri} );
}

function getAllBlacklists(){
    let blacklists = getAllBlacklist();
    return blacklists.find();
}

function deleteBlacklist(blacklist){
    let blacklists = getAllBlacklist();
    blacklists.remove(blacklist);
}

module.exports = {
    createBlacklist,
    createHistory,
    createOther,
    createSearch,
    deleteBlacklist,
    deleteSearch,
    getAllBlacklists,
    getBlacklist,
    getHistory,
    getOther,
    getSearch,
    updateHistory,
    updateOther,
    updateSearch
}