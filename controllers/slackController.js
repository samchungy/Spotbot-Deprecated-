const axios = require('axios');
const qs = require('querystring');
const CONSTANTS = require('../constants');
const logger = require('../log/winston');

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

async function sendEphemeralReply(text, attachments, response_url){
    await postReply(reply("ephemeral", text, attachments), response_url);
}
async function sendReply(text, attachments, response_url){
    await postReply(reply("in_channel", text, attachments), response_url);
}

async function sendDeleteReply(text, attachments, response_url){
    await postReply(deleteReply("in_channel", text, attachments), response_url);
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


function trackToSlackAttachment(track, trigger_id) {

    try {
        var image = "";
        if (track.album.images){
            image = track.album.images[0].url;
        }
        return {
            "color": "#36a64f",
            "title": track.name,
            "title_link": track.external_urls.spotify,
            "text": `:studio_microphone: *Artist* ${track.artists[0].name}\n\n:cd: *Album* ${track.album.name}`,
            "mrkdwn_in": ["text"],
            "thumb_url": `${image}`,
            "callback_id": trigger_id,
            "actions": [{
                "text": "Add to playlist",
                "type": "button",
                "style": "primary",
                "name": CONSTANTS.ADD_SONG,
                "value": track.uri
            }]
        };
    } catch (error) {
        logger.error(`Artist slack attachment fail ${JSON.stringify(error)}`, error, error);
    }
}

function trackToBlacklistAttachment(track, trigger_id) {

    try {
        var image = "";
        if (track.album.images){
            image = track.album.images[0].url;
        }
        return {
            "color": "#36a64f",
            "title": track.name,
            "title_link": track.external_urls.spotify,
            "text": `:studio_microphone: *Artist* ${track.artists[0].name}\n\n:cd: *Album* ${track.album.name}`,
            "mrkdwn_in": ["text"],
            "thumb_url": `${image}`,
            "callback_id": trigger_id,
            "actions": [{
                "text": "Add to blacklist",
                "type": "button",
                "style": "primary",
                "name": CONSTANTS.BLACKLIST,
                "value": track.uri
            }]
        };
    } catch (error) {
        logger.error(`Blacklist slack attachment fail ${JSON.stringify(error)}`, error);
    }
}

function artistToSlackAttachment(artist, trigger_id) {
    try {
        var genres;
        if (artist.genres.length == 0){
            genres = "Unknown"
        } else {
            genres = artist.genres.join(', ');
        }
        var image = "";
        if (artist.images.length > 0 && artist.images[0]){
            image = artist.images[0].url;
        }
        return {
            "color": "#36a64f",
            "title": artist.name,
            "title_link": artist.external_urls.spotify,
            "text": `:musical_note: *Genres* ${genres}\n\n :busts_in_silhouette: *Followers* ${artist.followers.total}`,
            "mrkdwn_in": ["text"],
            "thumb_url": `${image}`,
            "callback_id": trigger_id,
            "actions": [{
                "text": "View artist tracks",
                "type": "button",
                "style": "primary",
                "name": CONSTANTS.ARTIST,
                "value": artist.name
            }]
        };
    } catch (error) {
        logger.error(`Artist slack attachment fail ${JSON.stringify(error)}`, error);
    }

}

function dialogOption(value, label){
    return {
        "label": label,
        "value": value
    }
}

function selectOption(value, text){
    return {
        "text": text,
        "value": value
    }
}

function slackAttachment(text, callback_id, fallback, action_text, action_name, action_value){
    return {
        "text" : text,
        "callback_id" : callback_id,
        "fallback" : fallback,
        "actions" : [{
            "text": action_text,
            "type": "button",
            "name": action_name,
            "value" : action_value
        }]
    }
}

function urlAttachment(fallback, action_text, action_url){
    return {
        fallback: fallback,
        "actions" : [{
            "type": "button",
            "style": "primary",
            "text": action_text,
            "url": action_url
        }]
    }
}

async function send(message, response_url){
    try {
        await axios.post(response_url, message);
    } catch (error) {
        logger.error(`Send to slack failed ${JSON.stringify(error)}`, error);
        throw Error(error);
    }
}


async function sendDialog(params){
    try {
        return axios.post(`https://slack.com/api/dialog.open`, qs.stringify(params));

    } catch (error) {
        logger.error(`Send dialog failed ${JSON.stringify(error)}`, error)
    }
}

async function post(channel_id, text){
    try {
        var params = {
            token: process.env.SLACK_TOKEN,
            channel: channel_id,
            text: text
        }
        await axios.post(`https://slack.com/api/chat.postMessage`, qs.stringify(params));
    } catch (error) {
        logger.error(`Failed to post to slack ${JSON.stringify(error)}`, error);
        throw Error(error);
    }
}

async function postEphemeral(channel_id, user, text){
    try {
        params = {
            token: process.env.SLACK_TOKEN,
            channel: channel_id,
            user: user,
            text: text
        }
        return axios.post(`https://slack.com/api/chat.postEphemeral`, qs.stringify(params));
    }
    catch(error){
        logger.error(`Failed to ephemeral post to slack ${JSON.stringify(error)}`, error);
        throw Error(error);
    }
    
}

async function postReply(body, response_url){
    try {
        return await axios.post(response_url, body);
    } catch (error) {
        logger.error(`Slack post reply failed ${JSON.stringify(error)}`, error);
    }
}

function selectAttachment(fallback, callback_id, action_name, action_text, options){
    return {
        "fallback" : fallback,
        "callback_id" : callback_id,
        "actions" : [
            {
                "name": action_name,
                "text": action_text,
                "type": select,
                "options" : options
            }
        ]
    }
}

function ack(){
    return reply("in_channel", "");
}

module.exports = {
    ack,
    artistToSlackAttachment,
    send,
    reply,
    deleteReply,
    dialogOption,
    post,
    postReply,
    postEphemeral,
    trackToSlackAttachment,
    trackToBlacklistAttachment,
    slackAttachment,
    selectAttachment,
    selectOption,
    sendDeleteReply,
    sendDialog,
    sendEphemeralReply,
    sendReply,
    urlAttachment
};