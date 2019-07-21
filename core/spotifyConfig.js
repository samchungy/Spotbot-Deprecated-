const CONSTANTS = require('../constants');
const config = require('../db/config');
const slack = require('../slackController');
const {spotifyApi} = require('../controllers/spotify');
const {authenticate, isAuthExpired} = require('../core/spotifyAuth');

async function setup(user_id, trigger_id, response_url){
    var admins = config.getAdmins();
    var auth = config.getAuth();
    console.log(auth);
    // Assign user as admin.
    if (admins == null){
        config.setAdmin(user_id);
        slack.send(slack.reply("ephemeral","You have been added as the admin of Spotbot", null), response_url);
    }
    // Start Sp(otify Auth
    if (auth == null || isAuthExpired()){
        console.log("Adding auth");
        let ret = await authenticate(trigger_id, response_url, null, null)
        console.log(ret)
        return(ret);
    }
    console.log("no action");
}
// ------------------------
// Spotify Settings
// ------------------------

async function settings(trigger_id){
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
            "hint": "The duration where no one can add the same song. Set it to 0 to allow repeats whenever. Integers only"
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
    // open the dialog by calling dialogs.open method and sending the payload
    try {
        let results = await slack.sendDialog(params);
        if (results.data.ok){
            return null;
        }
        else{
            console.log(results.data.error);
            return slack.reply("ephemeral", "Call for settings failed.", null);
        }
    } catch (error) {
        console.log(error);
    }
}

/**
 * 
 * @param {} submission 
 */
async function verifySettings(submission){
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
        return {errors};
    }
    else{
        console.log("NO errors bro");
        if (spotify_config == null) {
            config.setSpotifyConfig();
            spotify_config = config.getSpotifyConfig();
        }
        // Add to DB.
        if (spotify_config.playlist != submission.playlist) {
            //TODO Update Playlist on Spotify
            try {
                let result = await spotifyApi.getUserPlaylists({ limit: 50 });
                for (let playlist of result.body.items) {
                    // If a playlist currently exists
                    if (submission.playlist == playlist.name) {
                        config.setSpotifyConfig(submission.skip_votes, submission.back_to_playlist, submission.now_playing,
                            submission.disable_repeats_duration, submission.playlist, submission.playlist_id);
                        return slack.reply("ephemeral", "Settings successfully saved.", null);
                    }
                }
                // Doesn't exist, let's make one.
                try {
                    let createdPlaylist = await spotifyApi.createPlaylist(auth.id, submission.playlist, {public : false, collaborative : true });
                    config.setSpotifyConfig(submission.skip_votes, submission.back_to_playlist, submission.now_playing,
                        submission.disable_repeats_duration, submission.playlist, createdPlaylist.body.id);
                    return(slack.reply("ephemeral", "Settings successfully saved.", null));
                } catch (error) {
                    console.log("Error creating Playlist", error);
                    return(slack.reply("ephemeral", "An error occured, settings were not saved.", null));
                }
            } catch (error) {
                console.log("Failed to get User Playlists", error);
                return(slack.reply("ephemeral", "An error occured, settings were not saved.", null));
            }
        }
        else{
            config.setSpotifyConfig(submission.skip_votes, submission.back_to_playlist, submission.now_playing,
                submission.disable_repeats_duration, submission.playlist, submission.playlist_id);
            return(slack.reply("ephemeral", "Settings successfully saved.", null));
        }
    }

}

function isPositiveInteger(n) {
    return n >>> 0 === parseFloat(n);
}

module.exports = {
    setup,
    settings,
    verifySettings
}