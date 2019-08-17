const CONSTANTS = require('../../../constants');
const tracks = require('../../../db/tracks');
const {getSearch, updateSearch, deleteSearch} = require('../tracks/tracksDAL');

function createArtistSearch(trigger_id, artist_list, total_pages){
    let search = {
        [CONSTANTS.DB.KEY.TRIGGER_ID] : trigger_id,
        artists: artist_list,
        total_pages: total_pages
    }
    tracks.createSearch(search);
};

module.exports = {
    createArtistSearch,
    getSearch,
    deleteSearch,
    updateSearch
}