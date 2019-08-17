const CONSTANTS = require('../constants');
const loki = require('lokijs');
const logger = require('../log/winston');

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

async function initialiseConfig() {
    try {
        var configs = db.getCollection(CONSTANTS.DB.COLLECTION.CONFIG);
        // If collection is empty do not load it, instead - create a new file
        if (configs === null || configs.count() == 0) {
            db.addCollection(CONSTANTS.DB.COLLECTION.CONFIG);
            db.addCollection(CONSTANTS.DB.COLLECTION.AUTH);
            return;
        }
        let {initialiseAuth} = require('../components/spotify/auth/spotifyAuthController');    
        await initialiseAuth();
        let {initialiseSettings} = require('../components/settings/settingsController');
        await initialiseSettings();
        // let {initialise2} = require('../core/spotifyConfig');
        // initialise2();
    } catch (error) {
        logger.error("Fail to initialise config - ", error);
    }

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
        db2.addCollection(CONSTANTS.DB.COLLECTION.OTHER, {
            unique: CONSTANTS.DB.KEY.NAME
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