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
    var configs = db.getCollection(CONSTANTS.CONFIG);
    // If collection is empty do not load it, instead - create a new file
    if (configs === null || configs.count() == 0) {
        db.addCollection(CONSTANTS.CONFIG);
        return;
    }
    let {initialise} = require('../core/spotifyAuth');
    initialise();
}

/**
 * Initialise the database
 */
function initialiseTracks() {
    var searches = db2.getCollection(CONSTANTS.SEARCH);
    var history = db2.getCollection(CONSTANTS.HISTORY);
    var skip = db2.getCollection(CONSTANTS.SKIP);
    var current_track = db2.getCollection(CONSTANTS.CURRENT_TRACK);

    if (searches === null || searches.count() == 0) {
        db2.addCollection(CONSTANTS.SEARCH, {
            unique: CONSTANTS.TRIGGER_ID
        });
    }
    if (history === null || history.count() == 0) {
        db2.addCollection(CONSTANTS.HISTORY, {
            unique: CONSTANTS.TRACK_URI
        });
    }
    if (skip === null || skip.count() == 0) {
        db2.addCollection(CONSTANTS.SKIP, {
            unique: CONSTANTS.SKIP
        });
    }
    if (current_track === null || current_track.count() == 0) {
        db2.addCollection(CONSTANTS.CURRENT_TRACK, {
            unique: CONSTANTS.CURRENT_TRACK
        });
    }
    let {initialise} = require('../core/spotifyConfig');
    try {
        wait(3000);
        initialise();
    } catch (error) {
        wait(5000);
        initialise();
    }

}

function wait(ms){
    var start = new Date().getTime();
    var end = start;
    while(end < start + ms) {
      end = new Date().getTime();
   }
 }

module.exports = {
    db,
    db2
}