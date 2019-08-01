const CONSTANTS = require('../constants');
const init = require('./init');
const {db} = init;

/**
 * Set an admin for Slackbot
 * @param {string} user_name Slack User id
 */
function setAdmin(user_name){
    var admins = find(CONSTANTS.ADMIN);
    if (admins == null){
        create(CONSTANTS.ADMIN);
        var admins = find(CONSTANTS.ADMIN);
    }
    if (admins.users == null){
        admins.users = [user_name];
    }
    else{
        admins.users.push(user_name);
    }
    update(admins);
}

/**
 * Create the authentication 
 * @param {string} trigger_id Slack trigger id
 * @param {number} trigger_expires Slack trigger expiry date
 * @param {string} response_url Slack response URL
 * @param {string} channel_id Slack channel ID
 * @param {string} team_id Slack team id
 */
function setAuth(trigger_id, trigger_expires, response_url, channel_id){
    var auth = find(CONSTANTS.AUTH);
    if (auth == null){
        create(CONSTANTS.AUTH);
        return; // Initialisation of Authorisation
    }
    auth.trigger_id = trigger_id;
    auth.trigger_expires = trigger_expires;
    auth.response_url = response_url;
    auth.channel_id = channel_id;
    update(auth);
}

function setSpotifyConfig(skip_votes, back_to_playlist, now_playing, disable_repeats_duration, 
    playlist, playlist_id){
    var spotify_config = find(CONSTANTS.SPOTIFY_CONFIG);
    if (spotify_config == null){
        create(CONSTANTS.SPOTIFY_CONFIG);
        return; // Initialisation of Authorisation
    }
    spotify_config.skip_votes = skip_votes;
    spotify_config.back_to_playlist = back_to_playlist;
    spotify_config.now_playing = now_playing;
    spotify_config.disable_repeats_duration = disable_repeats_duration;
    spotify_config.playlist = playlist;
    spotify_config.playlist_id = playlist_id;
    update(spotify_config);
}

/**
 * Get the Spotify Config settings.
 */
function getSpotifyConfig(){
    return find(CONSTANTS.SPOTIFY_CONFIG);
}

/**
 * Get the Spotify Auth settings.
 */
function getAuth(){
    return find(CONSTANTS.AUTH);
}

/**
 * Get Spotbot admins
 */
function getAdmins(){
    return find(CONSTANTS.ADMIN);
}

/**
 * 
 * @param {} item 
 */
function update(item){
    var configs = db.getCollection(CONSTANTS.CONFIG);
    configs.update(item);
}

function find(name){
    var configs = db.getCollection(CONSTANTS.CONFIG);
    return configs.findOne( { name: name } );
}

function create(name){
    var configs = db.getCollection(CONSTANTS.CONFIG);
    configs.insert({
        name: name
    });
}

module.exports = {
    getAuth,
    getAdmins,
    getSpotifyConfig,
    setAdmin,
    setAuth,
    setSpotifyConfig,
    update
};