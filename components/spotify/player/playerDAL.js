const logger = require('../../../log/winston');
const CONSTANTS = require('../../../constants');
const tracks = require('../../../db/tracks');

function getSkip(){
    return tracks.getOther(CONSTANTS.DB.COLLECTION.SKIP);
}

function createSkip(){
    skip_track = getSkip();
    if (skip_track == null){
        tracks.createOther(CONSTANTS.DB.COLLECTION.SKIP);
        return;
    }
}

function updateSkip(uri, name, artist, users){
    skip_track = getSkip();
    skip_track.uri = uri;
    skip_track.name = name;
    skip_track.artist = artist;
    skip_track.users = users;
    tracks.updateOther(skip_track);
}



module.exports = {
    createSkip,
    getSkip,
    updateSkip
}

function skip_attachment(slack_users, num_votes, track_uri){
    var users = "";
    var votes_word = "votes";
    for (let user of slack_users){
        users += `<@${user}> `
    }
    if (num_votes == 1){
        votes_word = "vote";
    }
    var attachment = {
        "text": `Votes: ${users}`,
        "footer": `${num_votes} more ${votes_word} needed.`,
        "fallback": `Votes: ${users}`,
        "callback_id": track_uri,
        "color": "#3AA3E3",
        "attachment_type": "default",
        "actions": [
            {
                "name": CONSTANTS.SKIP,
                "text": "Skip",
                "type": "button",
                "value": "skip"
            }
        ]
    }
    return attachment;
}