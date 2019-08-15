const CONSTANTS = require('../constants');
const init = require('./init2');
const {db} = init;

/**
 * 
 * @param {} item 
 */
function update(item){
    let configs = getConfig();
    configs.update(item);
}

function find(name){
    let configs = getConfig();
    return configs.findOne( { name: name } );
}

function create(name){
    let configs = getConfig();
    configs.insert({
        name: name
    });
}

function getConfig(){
    return db.getCollection(CONSTANTS.DB.COLLECTION.CONFIG);
}

module.exports = {
    create,
    find,
    update
};