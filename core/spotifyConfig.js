const CONSTANTS = require('../constants');
const config = require('../db/config');
const slack = require('../controllers/slackController');
const {spotifyApi} = require('../controllers/spotify');
const spotify_player = require('../controllers/spotifyPlayer');
const {authenticate, isAuthExpired} = require('../core/spotifyAuth');
const logger = require('../log/winston');

async function setup_auth(trigger_id, response_url, channel_id){
    try {
        let auth_url = await authenticate(trigger_id, response_url, channel_id);
        var auth_attachment = slack.urlAttachment("Please visit the following link to authenticate your Spotify account: " + auth_url, 
            ":link: Authenticate with Spotify", auth_url)
        slack.sendEphemeralReply("Please visit the following link to authenticate your Spotify account. You have 30 minutes to authenticate.", 
            [auth_attachment], response_url);
        return;
    } catch (error) {
        logger.error(`Setting up auth failed ${error}`);
    }
}

async function setup(user_name, trigger_id, response_url, channel_id){
    try {
        var admins = config.getAdmins();
        var auth = config.getAuth();
        // Assign user as admin.
        if (admins == null){
            config.setAdmin(user_name);
            slack.sendEphemeralReply("You have been added as the admin of Spotbot", null, response_url);
        }
        // Start Sp(otify Auth
        if (auth == null || isAuthExpired()){
            setup_auth(trigger_id, response_url);
        }
    } catch (error) {
        logger.error(`Setting up Spotbot failed ${error}`);
    }

}
// ------------------------
// Spotify Settings
// ------------------------

async function settings(trigger_id, response_url){
    try{
        var spotify_config = config.getSpotifyConfig();
        var playlist = "", 
            disable_repeats_duration = "",
            skip_votes = "",
            back_to_playlist = "",
            now_playing = "";
    
        if (spotify_config != null){
            if (spotify_config.playlist){
                playlist = spotify_config.playlist;
            }
            if (spotify_config.disable_repeats_duration){
                disable_repeats_duration = spotify_config.disable_repeats_duration;
            }
            if (spotify_config.skip_votes){
                skip_votes = spotify_config.skip_votes;
            }
            if (spotify_config.back_to_playlist){
                back_to_playlist = spotify_config.back_to_playlist;
            }
            if (spotify_config.now_playing){
                now_playing = spotify_config.now_playing;
            }
        }
    
        var dialog = {
            "callback_id": CONSTANTS.SPOTIFY_CONFIG,
            "title": "Spotbot Settings",
            "submit_label": "Save",
            "elements": [
              {
                "type": "text",
                "label": "Playlist",
                "name": "playlist",
                "max_length": "100",
                "placeholder": "SpotbotPlaylist",
                "value": `${playlist}`,
                "hint": "The name of the playlist Spotbot will save to. If it does not exist Spotbot will create one for you."
              },
              {
                "type": "text",
                "label": "Disable repeats duration (hours)",
                "name": "disable_repeats_duration",
                "placeholder" : "3",
                "subtype" : "number",
                "value" : `${disable_repeats_duration}`,
                "hint": "The duration where no one can add the same song. Set it to 0 to allow repeats all the time. Integers only"
              },
              {
                "type": "select",
                "label": "Back to Playlist",
                "name": "back_to_playlist",
                "value": `${back_to_playlist}`,
                "hint" : "Enables the ability for Spotify to return to the playlist if it runs out of songs AND a new song is added",
                "options": [
                  {
                    "label": "Yes",
                    "value": "yes"
                  },
                  {
                    "label": "No",
                    "value": "no"
                  }
                ]
              },
              {
                "type": "select",
                "label": "Now playing messages",
                "name": "now_playing",
                "value": `${now_playing}`,
                "hint" : "Sends a now playing message when a song changes",
                "options": [
                  {
                    "label": "Yes",
                    "value": "yes"
                  },
                  {
                    "label": "No",
                    "value": "no"
                  }
                ]
              },
              {
                "type": "text",
                "label": "Votes needed to Skip",
                "name": "skip_votes",
                "placeholder" : "3",
                "value": `${skip_votes}`,
                "subtype" : "number",
                "hint": "The number of votes needed to skip a song. Integers only"
              }
            ]
          };
    
          var params = {
            token: process.env.SLACK_TOKEN,
            trigger_id: trigger_id,
            dialog : JSON.stringify(dialog)
          };
          let results = await slack.sendDialog(params);
          if (results.data.ok){
              return;
          }
          else{
              throw(Error(results.data.error))
          }
    
    } catch(error){
        logger.error(`Settings failed ${error}`);
        slack.sendEphemeralReply("Settings call failed", null, response_url); 

    }
}

/**
 * 
 * @param {} submission 
 */
async function verifySettings(submission, response_url){
    try {
        var spotify_config = config.getSpotifyConfig();
        var auth = config.getAuth();
        //Validate submissions
        var errors = [];
        if (!isPositiveInteger(submission.disable_repeats_duration)){
            errors.push(
                {
                    "name": "disable_repeats_duration",
                    "error": "Please enter a valid integer"
                }
            )
        }
        if (!isPositiveInteger(submission.skip_votes)){
            errors.push(
                {
                    "name" : "skip_votes",
                    "error" : "Please enter a valid integer"
                }
            )
        }
        if (errors.length > 0){
            return errors;
            // return {errors};
        }
        else{
            if (spotify_config == null) {
                config.setSpotifyConfig();
                spotify_config = config.getSpotifyConfig();
            }
            // Add to DB.
            if (spotify_config.playlist != submission.playlist) {
                let result = await spotify_player.getAllPlaylists();
                for (let playlist of result.body.items) {
                    // If a playlist currently exists
                    if (submission.playlist == playlist.name) {
                        config.setSpotifyConfig(submission.skip_votes, submission.back_to_playlist, submission.now_playing,
                            submission.disable_repeats_duration, submission.playlist, playlist.id);
                        slack.sendEphemeralReply(":white_check_mark: Settings successfully saved.", null, response_url);
                        return;
                    }
                }

                let createdPlaylist = await spotifyApi.createPlaylist(auth.id, submission.playlist, {public : false, collaborative : true });
                config.setSpotifyConfig(submission.skip_votes, submission.back_to_playlist, submission.now_playing,
                    submission.disable_repeats_duration, submission.playlist, createdPlaylist.body.id);
                slack.sendEphemeralReply(":white_check_mark: Settings successfully saved.", null, response_url);
                return;

            }
            else{
                config.setSpotifyConfig(submission.skip_votes, submission.back_to_playlist, submission.now_playing,
                    submission.disable_repeats_duration, submission.playlist, getPlaylistId());
                slack.sendEphemeralReply(":white_check_mark: Settings successfully saved.", null, response_url);
                return;
            }
        }
    
    } catch (error) {
        logger.error(`Verifying settings failed ${error}`);
    }
}

function addAdmin(slack_user, response_url){
    try {
        if (!slack_user){
            slack.sendEphemeralReply(`No user specified. `, null, response_url);
            return;
        }
        slack_name = slack_user.substr(1)
        var admins = config.getAdmins();
        if (admins.users.includes(slack_name)){
            slack.sendEphemeralReply(`<${slack_user}> is already an admin. `, null, response_url);
            return;
        }
        config.setAdmin(slack_name);
        slack.sendEphemeralReply(`<${slack_user}> has been added as an admin.`, null, response_url);
        return;
    } catch (error) {
        logger.error(`Adding admin failed ${error}`);
    }
}

function removeAdmin(slack_user, requester, response_url){
    try {
        if (!slack_user){
            slack.sendEphemeralReply(`No user specified. `, null, response_url);
            return;
        }
        slack_name = slack_user.substr(1);
        if(slack_name == requester){
            slack.sendEphemeralReply("You cannot remove yourself as an admin.", null, response_url);
            return;
        }
        var admins = config.getAdmins();
        if (admins.users.includes(slack_name)){
            admins.users.splice( admins.users.indexOf(slack_name), 1 );
            config.update(admins);
            slack.sendEphemeralReply(`Successfully removed <${slack_user}> from admins.`, null, response_url);
            return;
        } else {
            slack.sendEphemeralReply(`<${slack_user}> is not an admin.`, null, response_url);
        }
    } catch (error) {
        logger.error(`Removing admin failed ${error}`);
    }

}

function isPositiveInteger(n) {
    return n >>> 0 === parseFloat(n);
}

async function isSetup(response_url){
    try {
        var admins = config.getAdmins();
        if (admins == null){
            await slack.sendEphemeralReply("Please run `/spotbot setup`.", null, response_url);
            return false;
        }
        else{
            return true;
        }
    } catch (error) {
        logger.error(`isSetup failed ${error}`);
    }
}

async function isSettingsSet(req, res, next){
    try {
        if (config.getSpotifyConfig() == null){
            await slack.sendReply("Please run `/spotbot settings` to set up Spotbot", null, req.body.response_url);
            res.send();
        }
        else{
            next();
        }
    } catch (error) {
        logger.error(`IsAuthed failed ${error}`);
    }
}

function getAdmins(response_url){
    var admins = config.getAdmins();
    var admin_string = "";
    for (let i of admins.users){
        admin_string += `<@${i}> `
    }
    slack.sendEphemeralReply(`Current Admins: ${admin_string}`, null, response_url);
}

function getPlaylistId(){
    return config.getSpotifyConfig().playlist_id;
}

function getSkipVotes(){
    return config.getSpotifyConfig().skip_votes;
}

function getDisableRepeatsDuration(){
    return config.getSpotifyConfig().disable_repeats_duration;
}

function getBackToPlaylist(){
    return config.getSpotifyConfig().back_to_playlist;
}

function getSpotifyUserId(){
    return config.getAuth().id;
}

function getChannel(){
    return config.getAuth().channel_id;
}


module.exports = {
    addAdmin,
    isSetup,
    isSettingsSet,
    getAdmins,
    getBackToPlaylist,
    getChannel,
    getDisableRepeatsDuration,
    getPlaylistId,
    getSkipVotes,
    getSpotifyUserId,
    removeAdmin,
    setup,
    setup_auth,
    settings,
    verifySettings
}