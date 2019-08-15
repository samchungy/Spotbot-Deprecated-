const CONSTANTS = require('../constants');
const loki = require('lokijs');

const db = new loki(CONSTANTS.CONFIG_FILE, {
    autoload: true,
    autoloadCallback: initialiseConfig,
    autosave: true
});

const db2 = new loki(CONSTANTS.TRACKS_FILE, {
    autoload: true,
    autoloadCallback: initialiseTracks,
    autosave: true
});

function initialiseConfig() {
    var configs = db.getCollection(CONSTANTS.DB.COLLECTION.CONFIG);
    // If collection is empty do not load it, instead - create a new file
    if (configs === null || configs.count() == 0) {
        db.addCollection(CONSTANTS.DB.COLLECTION.CONFIG);
        db.addCollection(CONSTANTS.DB.COLLECTION.AUTH);
        return;
    }
    let {initialiseAuth} = require('../components/spotify/auth/spotifyAuthController');
    initialiseAuth();
    // let {initialise2} = require('../core/spotifyConfig');
    // initialise2();
}

/**
 * Initialise the database
 */
function initialiseTracks() {
    var searches = db2.getCollection(CONSTANTS.DB.COLLECTION.SEARCH);

    if (searches === null || searches.count() == 0) {
        db2.addCollection(CONSTANTS.DB.COLLECTION.SEARCH, {
            unique: CONSTANTS.DB.KEY.TRIGGER_ID
        });
        db2.addCollection(CONSTANTS.DB.COLLECTION.HISTORY, {
            unique: CONSTANTS.DB.KEY.TRACK_URI
        });
        db2.addCollection(CONSTANTS.DB.COLLECTION.SKIP, {
            unique: CONSTANTS.DB.KEY.SKIP
        });
        db2.addCollection(CONSTANTS.DB.COLLECTION.CURRENT_TRACK, {
            unique: CONSTANTS.DB.KEY.CURRENT_TRACK
        });
        db2.addCollection(CONSTANTS.DB.COLLECTION.BLACKLIST, {
            unique: CONSTANTS.DB.KEY.BLACKLIST
        });
    }
}

module.exports = {
    db,
    db2
}