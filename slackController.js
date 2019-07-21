const axios = require('axios');
const qs = require('querystring');
const CONSTANTS = require('./constants');

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

function deleteReply(response_type, text, attachments){
    var message = {
        "response_type" : response_type,
        "text" : text,
        "delete_original": true
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

async function send(message, response_url){
    try {
        await axios.post(response_url, message);
        console.log("Message sent");
    } catch (error) {
        console.log(error);
    }
}


async function sendDialog(params){
    return axios.post(`https://slack.com/api/dialog.open`, qs.stringify(params));
}

async function post(params){
    params.token = process.env.SLACK_TOKEN;
    return axios.post(`https://slack.com/api/chat.postMessage`, qs.stringify(params));
}

async function postEphemeral(params){
    params.token = process.env.SLACK_TOKEN;
    return axios.post(`https://slack.com/api/chat.postEphemeral`, qs.stringify(params));
}

async function postReply(body, response_url){
    return axios.post(response_url, body);
}

module.exports = {
    send,
    reply,
    deleteReply,
    post,
    postReply,
    postEphemeral,
    spotifyToSlackAttachment,
    sendDialog
};