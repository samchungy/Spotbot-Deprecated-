const _ = require('lodash');
const schedule = require('node-schedule');
const player_api = require('../spotify/player/playerAPI');
const settings_dal = require('./settingsDAL');
const CONSTANTS = require('../../constants');
const HINTS = CONSTANTS.SLACK.DIALOG.HINTS;
const logger = require('../../log/winston');

class settingsController {
  constructor (slack_controller, admin_controller, spotify_auth_controller){
    this.slack_controller = slack_controller;
    this.slack_formatter = slack_controller.slack_formatter;
    this.admin_controller = admin_controller;
    this.spotify_auth_controller = spotify_auth_controller;
  }

  async settings(trigger_id) {
    try {
      var spotbot_config = settings_dal.getSpotbotConfig();
      var settings_list = {
        channel: "",
        playlist: "",
        channel: "",
        disable_repeats_duration: "",
        skip_votes: "",
        skip_votes_after_hours: "",
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
        settings_list.default_device_options = [new this.slack_formatter.selectDialogOption(spotbot_config.default_device_name, `${spotbot_config.default_device}:${spotbot_config.default_device_name}`).json]
      }
      let yes_no_option = [new this.slack_formatter.selectDialogOption("Yes", "yes").json, new this.slack_formatter.selectDialogOption("No", "no").json]
      let elements = [
        new this.slack_formatter.selectSlackDialogElement("channel", settings_list.channel, "Slack channel restriction",
          HINTS.CHANNEL, "channels", null).json,
        new this.slack_formatter.textDialogElement("playlist", settings_list.playlist, "Spotbot playlist",
          HINTS.PLAYLIST, "SpotbotPlaylist", "100", null).json,
        new this.slack_formatter.selectSlackDialogElement("default_device", null, "Default Spotify Device",
          HINTS.DEFAULT_DEVICE, "external", settings_list.default_device_options).json,
        new this.slack_formatter.textDialogElement("disable_repeats_duration", settings_list.disable_repeats_duration, "Disable repeats duration (hours)",
          HINTS.DISABLE_REPEATS, "2", null, "number").json,
        new this.slack_formatter.selectDialogElement("back_to_playlist", settings_list.back_to_playlist, "Back to Playlist",
          HINTS.BACK_TO_PLAYLIST, yes_no_option).json,
        new this.slack_formatter.selectDialogElement("now_playing", settings_list.now_playing, "Now playing messages",
          HINTS.NOW_PLAYING, yes_no_option).json,
        new this.slack_formatter.textDialogElement("skip_votes", settings_list.skip_votes, "Additional votes needed to skip",
          HINTS.SKIP_VOTES, "2", null, "number").json,
        new this.slack_formatter.textDialogElement("skip_votes_after_hours", settings_list.skip_votes_after_hours, "Additional votes needed to skip (After Hours)",
          HINTS.SKIP_VOTES_AFTER_HOURS, "1", null, "number").json
      ];
      let dialog = new this.slack_formatter.dialog(CONSTANTS.SLACK.PAYLOAD.SPOTBOT_CONFIG, "Spotbot Settings", "Save", elements).json;
      await this.slack_controller.sendDialog(trigger_id, dialog);

    } catch (error) {
      logger.error(`Settings failed`, error);
      throw Error(error);
    }
  }


  onPlaylist(context, playlist_id) {
    var regex = /[^:]+$/;
    var found;
    return !(context == null || (context.uri &&
        (found = context.uri.match(regex)) && found[0] != playlist_id));

}

  async getDeviceOptions() {
    try {
      var default_device_options = [new this.slack_formatter.selectDialogOption("None", "None:None").json];
      const spotbot_config = settings_dal.getSpotbotConfig();
      if (_.get(spotbot_config, "default_device")) {
        default_device_options.push(
          new this.slack_formatter.selectDialogOption(spotbot_config.default_device_name, `${spotbot_config.default_device}:${spotbot_config.default_device_name}`).json
        );
      }
      let devices = await player_api.getDevices();
      if (devices.body.devices.length != 0) {
        for (let device of devices.body.devices) {
          default_device_options.push(
            new this.slack_formatter.selectDialogOption(`${device.name} - ${device.type}`, `${device.id}:${device.name} - ${device.type}`).json
          )
        }
        /** Remove duplicates eg. if current saved device === one spotify found */
        default_device_options = _.uniqBy(default_device_options, 'value');
      }
      return {
        "options": default_device_options
      }
    } catch (error) {
      logger.error(`Getting device options failed `, error);
    }

  }

  /**
   * 
   * @param {} submission 
   */
  async verifySettings(submission, response_url) {
    try {
      var spotbot_config = settings_dal.getSpotbotConfig();
      //Validate submissions
      var errors = [];
      var number_submissions = ["disable_repeats_duration", "skip_votes", "skip_votes_after_hours"];
      for (let i of number_submissions) {
        if (!this.isPositiveInteger(submission[i])) {
          errors.push(new this.slack_formatter.dialogError(i, "Please enter a valid integer").json);
        }
      }
      if (errors.length > 0) {
        return errors;
      } else {
        // No Errors!
        if (spotbot_config == null) {
          // Create a new config if none exists
          settings_dal.setSpotbotConfig()
          spotbot_config = settings_dal.getSpotbotConfig();
        }
        var default_device = submission.default_device.split(":");
        var device_id = default_device[0];
        var device_name = default_device[1];
        // Add to DB.
        if (spotbot_config.playlist != submission.playlist) {
          // New playlist name, see if a playlist with that name already exists on the user's account
          let result = await player_api.getAllPlaylists();
          for (let playlist of result.body.items) {
            // If a playlist currently exists
            if (submission.playlist == playlist.name) {
              settings_dal.setSpotbotConfig(submission.skip_votes, submission.back_to_playlist, submission.now_playing, submission.disable_repeats_duration,
                submission.playlist, playlist.id, playlist.external_urls.spotify, device_id, device_name, submission.channel, submission.skip_votes_after_hours);
              this.verifyNowPlaying(submission.now_playing);
              await this.slack_controller.reply(":white_check_mark: Settings successfully saved.", null, response_url);
              return;
            }
          }
          // Playlist does not exist so we need to make one.
          let createdPlaylist = await player_api.createPlaylist(this.spotify_auth_controller.getSpotifyUserId(), submission.playlist);
          settings_dal.setSpotbotConfig(submission.skip_votes, submission.back_to_playlist, submission.now_playing, submission.disable_repeats_duration,
            submission.playlist, createdPlaylist.body.id, createdPlaylist.body.external_urls.spotify, device_id, device_name, submission.channel, submission.skip_votes_after_hours);
          this.verifyNowPlaying(submission.now_playing);
          await this.slack_controller.reply(":white_check_mark: Settings successfully saved.", null, response_url);
          return;

        } else {
          settings_dal.setSpotbotConfig(submission.skip_votes, submission.back_to_playlist, submission.now_playing, submission.disable_repeats_duration,
            submission.playlist, spotbot_config.playlist_id, spotbot_config.playlist_link, device_id, device_name, submission.channel, submission.skip_votes_after_hours);
          this.verifyNowPlaying(submission.now_playing);
          await this.slack_controller.reply(":white_check_mark: Settings successfully saved.", null, response_url);
          return;
        }
      }

    } catch (error) {
      logger.error(`Verifying settings failed - `, error);
      this.slack_controller.reply(":slightly_frowning_face: Settings did not save successfully", null, response_url);
    }
  }

  verifyNowPlaying(now_playing) {
    if (now_playing == "yes") {
      this.setNowPlaying();
    } else {
      this.removeNowPlaying();
    }
  }

  async initialise() {
    try {
      if (settings_dal.getSpotbotConfig() && this.getNowPlaying() == "yes") {
        await this.setNowPlaying();
      }
    } catch (error) {
      logger.error("Initialise failed - ", error);
    }
  }

  async help(user, response_url) {
    try {
      if (this.admin_controller.isAdminHelp(user)) {
        await this.slack_controller.reply(CONSTANTS.HELP + CONSTANTS.HELP_ADMIN, null, response_url);
      } else {
        await this.slack_controller.reply(CONSTANTS.HELP, null, response_url);
      }
    } catch (error) {
      logger.error("Help failed - ", error);
    }
  }

  getNowPlaying() {
    return settings_dal.getNowPlaying();
  }

  getPlaylistId() {
    return settings_dal.getPlaylistId();
  }

  getPlaylistLink() {
    return settings_dal.getPlaylistLink();
  }

  getDefaultDevice() {
    return settings_dal.getSpotbotConfig();
  }


  isPositiveInteger(n) {
    return n >>> 0 === parseFloat(n);
  }

  async setNowPlaying() {
    try {
        let channel_id = settings_dal.getChannel();
        let playlist_id = settings_dal.getPlaylistId();
        schedule.scheduleJob(CONSTANTS.CRONJOBS.NOW_PLAYING, '*/10 * * * * *', async () => {
            try {
                let current_track = await player_api.getPlayingTrack();
                if (current_track.statusCode == 204) {
                    return;
                }
                var current = settings_dal.getCurrent();
                if (current == null) {
                    settings_dal.createCurrent();
                    current = settings_dal.getCurrent();
                }
                if (!current || current_track.body.item.uri != current.uri) {
                    settings_dal.updateCurrent(current_track.body.item.uri);
                    if (this.onPlaylist(current_track.body.context, playlist_id)) {
                        this.slack_controller.post(channel_id, `:loud_sound: *Now Playing:* ${current_track.body.item.artists[0].name} - ${current_track.body.item.name}${current_track.body.item.explicit ? " (Explicit)" : ""} from the Spotify playlist.`);
                    } else {
                        this.slack_controller.post(channel_id, `:loud_sound: *Now Playing:* ${current_track.body.item.artists[0].name} - ${current_track.body.item.name}${current_track.body.item.explicit ? " (Explicit)" : ""}.`);
                    }
                }
            } catch (error) {
                logger.error(`Now Playing Cron Job Failed`, error);
            }
        });

    } catch (error) {
        logger.error("Setting now playing failed - ", error);
    }
}

removeNowPlaying() {
    try {
        logger.info("Removing now playing");
        var j = schedule.scheduledJobs[CONSTANTS.CRONJOBS.NOW_PLAYING]
        if (j) {
            j.cancel();
        }
    } catch (error) {
        logger.error("Failed to cancel now playing cronjob - ", error);
    }
}

}

function create(slack_controller, admin_controller, spotify_auth_controller){
  return new settingsController(slack_controller, admin_controller, spotify_auth_controller);
}

module.exports = {
  create
}