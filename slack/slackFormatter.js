

function ack(){
    return reply("in_channel", "");
}

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

module.exports = {
    ack,
    reply
}