const axios = require('axios');

/**
 * Reply formatted to Slack format.
 * @param {string} response_type 
 * @param {string} text 
 * @param {[attachment]} attachments 
 */
function reply(response_type, text, attachments){
    var message = {
        "response_type" : response_type,
        "text" : text
    }
    if (attachments){
        message.attachments = attachments;
    }
    return message
}


function spotifyToSlackAttachment(track, trigger_id) {
    return attachment = {
        "color": "#36a64f",
        "title": track.name,
        "title_link": track.external_urls.spotify,
        "text": `:studio_microphone: *Artist* ${track.artists[0].name}\n\n :cd: *Album* ${track.album.name}`,
        "thumb_url": `${track.album.images[0].url}`,
        "callback_id": trigger_id,
        "actions": [{
            "text": "Add to playlist",
            "type": "button",
            "style": "primary",
            "name": CONSTANTS.ADD_SONG,
            "value": track.uri
        }]
        };
}

async function sendToSlack(message, response_url, response_type){
    try {
        await axios.post(response_url, {
            "response_type" : response_type,
            "text" : message
        });
        console.log("Message sent");
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    sendToSlack,
    reply,
    spotifyToSlackAttachment
};