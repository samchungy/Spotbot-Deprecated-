const _ = require('lodash');

class attachment {
    constructor (text, fallback, callback_id){
        this.json = {
            text: text,
            fallback: fallback,
            callback_id : callback_id
        }
    }
}

class buttonAttachment extends attachment {
    constructor (text, fallback, callback_id, action_text, action_style, action_name, action_value){
        super(text, fallback, callback_id);
        this.json = Object.assign(this.json, {
            actions: [_.pickBy({
                type: "button",
                text: action_text,
                style: action_style,
                name: action_name,
                value : action_value
            })]
        });
    }
}

class footer_attachment extends buttonAttachment{
    constructor(text, fallback, callback_id, action_text, action_style, action_name, action_value, footer){
        super(text, fallback, callback_id, action_text, action_style, action_name, action_value);
        this.json = Object.assign(this.json, {
            footer: footer
        });
    }
}

class trackAttachment extends buttonAttachment {
    constructor (text, fallback, callback_id, action_text, action_style, action_name, action_value,
        thumb_url, title, title_link) {
        super(text, fallback, callback_id, action_text, action_style, action_name, action_value);
        this.json = Object.assign(this.json, {
            title: title,
            title_link : title_link,
            thumb_url : thumb_url
        });
    }
}

class selectAttachment extends attachment {
    constructor (text, fallback, callback_id, action_name, action_options){
        super(text, fallback, callback_id);
        this.json = Object.assign(this.json, {
            actions: [{
                type: "select",
                name: action_name,
                options: action_options
            }]
        });
    }
}

class urlButtonAttachment extends buttonAttachment {
    constructor(text, fallback, callback_id, action_text, action_style, action_name, action_value, action_url) {
        super(text, fallback, callback_id, action_text, action_style, action_name, action_value);
        this.json.actions[0] = Object.assign(this.json.actions[0], {
            url: action_url
        });
    }
}

class reply {
    constructor (text, attachments) {
        this.json = _.pickBy({
            text: text,
            attachments: attachments
        });
    }
}

class deleteReply extends reply {
    constructor(text, attachments) {
        super(text, attachments);
        this.json = Object.assign(this.json, {
            delete_original : true
        });
    }
}

class deleteInChannelReply extends deleteReply {
    constructor(text, attachments){
        super(text, attachments);
        this.json.response_type = "in_channel";
    }
}

class inChannelReply extends reply {
    constructor (text, attachments) {
        super(text, attachments);
        this.json.response_type = "in_channel";
    }
}

class dialog {
    constructor(callback_id, title, submit_label, elements){
        this.json = {
            callback_id: callback_id,
            title: title,
            submit_label: submit_label,
            elements: elements
        }
    }
}

class dialogParams {
    constructor (token, trigger_id, dialog){
        this.json = {
            token: token,
            trigger_id : trigger_id,
            dialog : JSON.stringify(dialog)
        }
    }
}

class postParams {
    constructor (token, channel_id, text){
        this.json = {
            token: token,
            channel: channel_id,
            text: text
        }
    }
}

class postEpehemralParams extends postParams {
    constructor (token, channel_id, text, user){
        super(token, channel_id, text);
        this.json = Object.assign(this.json, {
            user: user
        });
    }
}

class dialogElement {
    constructor(name, value, label, hint){
        this.json = {
            name: name,
            value: value,
            label: label,
            hint: hint
        }
    }
}

class selectDialogElement extends dialogElement {
    constructor (name, value, label, hint, options){
        super(name, value, label, hint);
        this.json = Object.assign(this.json, {
            type: "select",
            options: options
        })
    }
}

class selectSlackDialogElement extends dialogElement {
    constructor (name, value, label, hint, data_source, selected_options){
        super(name, value, label, hint);
        this.json = _.pickBy(Object.assign(this.json, {
            type: "select",
            data_source: data_source,
            selected_options: selected_options
        }));
    }
}

class textDialogElement extends dialogElement {
    constructor (name, value, label, hint, placeholder, max_length, subtype){
        super(name, value, label, hint)
        this.json = _.pickBy(Object.assign(this.json, {
            type: "text",
            placeholder: placeholder,
            max_length: max_length,
            subtype: subtype
        })); 
    }
}

class selectDialogOption {
    constructor (label, value){
        this.json = {
            label: label,
            value: value
        }
    }
}

class dialogError {
    constructor(name, error){
        this.json = {
            name: name,
            error: error
        }
    }
}


function ack(){
    return new inChannelReply("", null).json;
}

function ackDelete(){
    return new deleteReply("", null).json;
}

module.exports = {
    ack,
    ackDelete,
    buttonAttachment,
    deleteInChannelReply,
    deleteReply,
    dialog,
    dialogError,
    dialogParams,
    footer_attachment,
    inChannelReply,
    postEpehemralParams,
    postParams,
    reply,
    selectDialogElement,
    selectDialogOption,
    selectSlackDialogElement,
    textDialogElement,
    trackAttachment,
    urlButtonAttachment
}