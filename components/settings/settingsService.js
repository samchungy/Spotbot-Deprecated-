const _ = require('lodash');
const player_api = require('../spotify/player/playerAPI');
const slack_controller = require('../slack/slackController');
const slack_formatter = slack_controller.slack_formatter;
const {getSpotifyUserId} = require('../spotify/auth/spotifyAuthController');
const settings_dal = require('./settingsDAL');
const CONSTANTS = require('../../constants');
const HINTS = CONSTANTS.SLACK.DIALOG.HINTS;
const logger = require('../../log/winston');

async function settings(trigger_id){
    try{
        var spotbot_config = settings_dal.getSpotbotConfig();
        var settings_list = {
          channel: "",
          playlist: "",
          channel: "",
          disable_repeats_duration: "",
          skip_votes: "",
          back_to_playlist: "",
          now_playing: "",
          default_device_options: null,
          default_device: null,
          default_device_name: null
        }
        if (spotbot_config != null) {
          // For each setting try and grab the value from our 
            _.forEach(settings_list, (default_value, key) => {
                let val = _.get(spotbot_config, key);
                settings_list[key] = val ? val : default_value
            });
        }

        if (settings_list.default_device_name != null) {
          settings_list.default_device_options = [new slack_formatter.selectDialogOption(spotbot_config.default_device_name, `${spotbot_config.default_device}:${spotbot_config.default_device_name}`).json]
        }
        let yes_no_option = [new slack_formatter.selectDialogOption("Yes", "yes").json, new slack_formatter.selectDialogOption("No", "no").json]
        let elements = [
          new slack_formatter.selectSlackDialogElement("channel", settings_list.channel, "Slack channel restriction", 
            HINTS.CHANNEL, "channels", null).json,
          new slack_formatter.textDialogElement("playlist", settings_list.playlist, "Spotbot playlist",
            HINTS.PLAYLIST, "SpotbotPlaylist", "100", null).json,
          new slack_formatter.selectSlackDialogElement("default_device", null, "Default Spotify Device", 
            HINTS.DEFAULT_DEVICE, "external", settings_list.default_device_options).json,
          new slack_formatter.textDialogElement("disable_repeats_duration", settings_list.disable_repeats_duration, "Disable repeats duration (hours)",
            HINTS.DISABLE_REPEATS, "2", null, "number").json,
          new slack_formatter.selectDialogElement("back_to_playlist", settings_list.back_to_playlist, "Back to Playlist",
            HINTS.BACK_TO_PLAYLIST, yes_no_option).json,
          new slack_formatter.selectDialogElement("now_playing", settings_list.now_playing, "Now playing messages",
            HINTS.NOW_PLAYING, yes_no_option).json,
          new slack_formatter.textDialogElement("skip_votes", settings_list.skip_votes, "Additional votes needed to skip",
            HINTS.DISABLE_REPEATS, "2", null, "number").json
        ];
        let dialog = new slack_formatter.dialog(CONSTANTS.SLACK.PAYLOAD.SPOTBOT_CONFIG, "Spotbot Settings", "Save", elements).json;
        await slack_controller.sendDialog(trigger_id, dialog);
    
    } catch(error){
        logger.error(`Settings failed`, error);
        throw Error(error);
    }
}

async function getDeviceOptions(){
  try {
    var default_device_options = [new slack_formatter.selectDialogOption("None", "None:None").json];
    const spotbot_config = settings_dal.getSpotbotConfig();
    if (_.get(spotbot_config, "default_device")){
        default_device_options.push(
          new slack_formatter.selectDialogOption(spotbot_config.default_device_name, `${spotbot_config.default_device}:${spotbot_config.default_device_name}`).json
        );
    }
    let devices = await player_api.getDevices();
    if (devices.body.devices.length != 0){
        for(let device of devices.body.devices){
          default_device_options.push(
            new slack_formatter.selectDialogOption(`${device.name} - ${device.type}`, `${device.id}:${device.name} - ${device.type}`).json
          )
        }
        /** Remove duplicates eg. if current saved device === one spotify found */
        default_device_options = _.uniqBy(default_device_options, 'value');
    }
    return {
        "options" : default_device_options
    }
  } catch (error) {
    logger.error(`Getting device options failed `, error);
  }

}

/**
 * 
 * @param {} submission 
 */
async function verifySettings(submission, response_url){
  try {
      var spotbot_config = settings_dal.getSpotbotConfig();
      //Validate submissions
      var errors = [];
      var number_submissions = ["disable_repeats_duration", "skip_votes"];
      for (let i of number_submissions){
        if (!isPositiveInteger(submission[i])){
          errors.push(new slack_formatter.dialogError(i, "Please enter a valid integer").json);
        }
      }
      if (errors.length > 0){
          return errors;
      }
      else{
          // No Errors!
          if (spotbot_config == null) {
              // Create a new config if none exists
              settings_dal.setSpotbotConfig()
              spotbot_config = settings_dal.getSpotbotConfig();
          }
          var default_device = submission.default_device.split(":");
          var device_id = default_device[0];
          var device_name = default_device[1];

          if (submission.now_playing == "yes"){
              //setNowPlaying();
          } else {
              //removeNowPlaying();
          }
          // Add to DB.
          if (spotbot_config.playlist != submission.playlist) {
              // New playlist name, see if a playlist with that name already exists on the user's account
              let result = await player_api.getAllPlaylists();
              for (let playlist of result.body.items) {
                  // If a playlist currently exists
                  if (submission.playlist == playlist.name) {
                      settings_dal.setSpotbotConfig(submission.skip_votes, submission.back_to_playlist, submission.now_playing, submission.disable_repeats_duration, 
                        submission.playlist, playlist.id, playlist.external_urls.spotify, device_id, device_name, submission.channel);
                      slack_controller.reply(":white_check_mark: Settings successfully saved.", null, response_url);
                      return;
                  }
              }
              // Playlist does not exist so we need to make one.
              let createdPlaylist = await player_api.createPlaylist(getSpotifyUserId(), submission.playlist);
              settings_dal.setSpotbotConfig(submission.skip_votes, submission.back_to_playlist, submission.now_playing, submission.disable_repeats_duration, 
                submission.playlist, createdPlaylist.body.id, createdPlaylist.body.external_urls.spotify, device_id, device_name, submission.channel);
              slack_controller.reply(":white_check_mark: Settings successfully saved.", null, response_url);
              return;

          }
          else{
              settings_dal.setSpotbotConfig(submission.skip_votes, submission.back_to_playlist, submission.now_playing, submission.disable_repeats_duration,
                submission.playlist, spotbot_config.playlist_id, spotbot_config.playlist_link, device_id, device_name, submission.channel);
              slack_controller.reply(":white_check_mark: Settings successfully saved.", null, response_url);
              return;
          }
      }
  
  } catch (error) {
      logger.error(`Verifying settings failed`, error);
  }
}

function getPlaylistId(){
  return settings_dal.getSpotbotConfig().playlist_id;
}

function getPlaylistLink(){
  return settings_dal.getSpotbotConfig().playlist_link;
}

function getDefaultDevice(){
  return settings_dal.getSpotbotConfig().default_device;
}


function isPositiveInteger(n) {
  return n >>> 0 === parseFloat(n);
}

module.exports = {
  settings,
  getDefaultDevice,
  getDeviceOptions,
  getPlaylistId,
  getPlaylistLink,
  verifySettings
}