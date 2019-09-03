const CONSTANTS = require('../constants');
const loki = require('lokijs');
const logger = require('../log/winston');

const db = new loki(CONSTANTS.DB.SPOTBOT_FILE, {
    autosave: true
});

async function initialise(settings_controller, auth_controller, tracks_controller) {
    db.loadDatabase(null, async () => {
        try {
            var config = db.getCollection(CONSTANTS.DB.COLLECTION.CONFIG);
            // If collection is empty do not load it, instead - create a new file
            if (config === null) {
                console.log("config is null");
                db.addCollection(CONSTANTS.DB.COLLECTION.CONFIG);
                db.addCollection(CONSTANTS.DB.COLLECTION.SEARCH, {
                    unique: CONSTANTS.DB.KEY.TRIGGER_ID
                });
                db.addCollection(CONSTANTS.DB.COLLECTION.HISTORY, {
                    unique: CONSTANTS.DB.KEY.TRACK_URI
                });
                db.addCollection(CONSTANTS.DB.COLLECTION.OTHER, {
                    unique: CONSTANTS.DB.KEY.NAME
                });
                db.addCollection(CONSTANTS.DB.COLLECTION.BLACKLIST, {
                    unique: CONSTANTS.DB.KEY.BLACKLIST
                });
                return;
            }
            if (config.count() != 0) {
                await auth_controller.initialise();
                await settings_controller.initialiseSettings();
                await tracks_controller.initialiseClear();
            }
        } catch (error) {
            logger.error("Fail to initialise config - ", error);
        }
    });
}

// const db = new loki(CONSTANTS.DB.SPOTBOT_FILE, {
//     autoload: true,
//     autoloadCallback: initialise,
//     autosave: true
// });

// async function initialise(settings_controller, auth_controller, tracks_controller) {
//     try {
//         var config = db.getCollection(CONSTANTS.DB.COLLECTION.CONFIG);
//         console.log(config);
//         console.log(config.count());
//         // If collection is empty do not load it, instead - create a new file
//         if (config === null) {
//             console.log("config is null");
//             db.addCollection(CONSTANTS.DB.COLLECTION.CONFIG);
//             db.addCollection(CONSTANTS.DB.COLLECTION.AUTH);
//             db.addCollection(CONSTANTS.DB.COLLECTION.SEARCH, {
//                 unique: CONSTANTS.DB.KEY.TRIGGER_ID
//             });
//             db.addCollection(CONSTANTS.DB.COLLECTION.HISTORY, {
//                 unique: CONSTANTS.DB.KEY.TRACK_URI
//             });
//             db.addCollection(CONSTANTS.DB.COLLECTION.OTHER, {
//                 unique: CONSTANTS.DB.KEY.NAME
//             });
//             db.addCollection(CONSTANTS.DB.COLLECTION.BLACKLIST, {
//                 unique: CONSTANTS.DB.KEY.BLACKLIST
//             });
//             return;
//         }
//         if (config.count() != 0){
//             // await auth_controller.initialise();
//             // await settings_controller.initialiseSettings();
//             // await tracks_controller.initialiseClear();
//         }
//     } catch (error) {
//         logger.error("Fail to initialise config - ", error);
//     }
// }
module.exports = {
    db,
    initialise
};