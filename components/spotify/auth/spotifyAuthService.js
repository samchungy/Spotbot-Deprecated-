//Cron module for scheduling refresh
const schedule = require('node-schedule');
const logger = require('../../../log/winston');
const moment = require('moment');

const CONSTANTS = require('../../../constants');
const spotify_auth_dal = require('./spotifyAuthDAL');
const spotify_auth_api = require('./spotifyAuthAPI');

class spotifyAuthService {
    constructor(slack_controller, slack_formatter){
        this.slack_controller = slack_controller;
        this.slack_formatter = slack_formatter;
    }
    /**
     * Initialise/load the persistant lokijs database, start up CRON jobs.
     */
    async initialise() {
        try {
            if (this.isAuthExpired()) {
                logger.warn("Need to get a new authentication token from Spotify");
                return;
            }
            const auth = spotify_auth_dal.getAuth();
            // Re-configure the Spotify Api
            spotify_auth_api.updateTokens(auth.access_token, auth.refresh_token);
            // Try and renew token
            try {
                await this.refreshToken();
            } catch (error) {
                logger.warn("Need to get a new authentication token from Spotify");
                spotify_auth_dal.expireAuth();
                return;
            }
            this.setRefreshTokenCronJob();
        } catch (error) {
            logger.error(`Intializing auth failed`, error);
        }
    }

    /**
     * Get Access and Refresh Token from Spotify.
     * @param {String} code Code passed from Spotify Authorization Code Flow 
     * @param {String} state State passed from Spotify Authorization Code Flow
     */
    async getTokens(code, state) {
        try {
            const auth = spotify_auth_dal.getAuth();
            if (auth.trigger_id != state) {
                await this.slack_controller.reply(":no_entry: Invalid State, Please re-authenticate again", null, auth.response_url);
            } else if (moment().isAfter(moment(auth.trigger_expires))) {
                await this.slack_controller.reply(":no_entry: Your authentication window has expired. Please try again", null, auth.response_url);
            } else {
                let tokens = await spotify_auth_api.getTokens(code);
                //Save config in our db
                spotify_auth_dal.updateTokens(tokens.access_token, tokens.refresh_token);
                // Get Spotify ID (For playlist addition later)
                let profile = await spotify_auth_api.getProfile();
                spotify_auth_dal.setSpotifyUserId(profile.body.id);
                this.setRefreshTokenCronJob();
                await this.slack_controller.reply(":white_check_mark: Successfully authenticated.", null, auth.response_url);
            }
            return `slack://channel?id=${auth.channel_id}&team=${auth.team_id}`;

        } catch (error) {
            logger.error(`Auth grant failed`, error);
        }

    }

    /**
     * Checks if authentication is expired.
     */
    isAuthExpired() {
        const auth = spotify_auth_dal.getAuth();
        if (auth === null || moment().isAfter(moment(auth.expires))) {
            return true;
        }
        return false;
    }

    /**
     * Check if authentication has been setup
     */
    isAuthSetup() {
        const auth = spotify_auth_dal.getAuth();
        if (auth) {
            return false;
        }
        return true;
    }

    async setupAuth(trigger_id, response_url, channel_id, url) {
        try {
            var auth = spotify_auth_dal.getAuth();
            // 
            if (auth == null) {
                spotify_auth_dal.setupAuth();
                auth = spotify_auth_dal.getAuth();
            }
            spotify_auth_dal.setAuth(trigger_id, moment().add(30, 'm'), channel_id, response_url);
            // Create the authorization URL
            let auth_url = await spotify_auth_api.getAuthorizeURL(trigger_id, `http://${url}/${CONSTANTS.SPOTIFY_AUTH.REDIRECT_PATH}`);

            var auth_attachment = new this.slack_formatter.urlButtonAttachment(null, `Please visit the following link to authenticate your Spotify account: ${auth_url}`,
                null, ":link: Authenticate with Spotify", CONSTANTS.SLACK.BUTTON_STYLE.PRIMARY, null, null, auth_url).json;
            this.slack_controller.reply("Please visit the following link to authenticate your Spotify account. You have 30 minutes to authenticate.",
                [auth_attachment], response_url);
            return;
        } catch (error) {
            logger.error(`Setting up auth failed`, error);
        }
    }

    // ------------------------
    // Refresh Token Functions
    // ------------------------
    /**
     * Sets a CRON to update the access token.
     */
    setRefreshTokenCronJob() {
        try {
            logger.info("Setting refresh token Cronjob");
            schedule.scheduleJob(CONSTANTS.CRONJOBS.REFRESH, '*/30 * * * *', async () => {
                try {
                    logger.info("Refreshing token");
                    await this.refreshToken();
                } catch (error) {
                    logger.error(`Refresh Token Cron Job Failed`, error);
                }
            });
        } catch (error) {
            logger.error(`Setting refresh Cronjob failed`, error);
        }
    }

    /**
     * Calls the Spotify API to refresh the Access Token, updates Access Token.
     */
    async refreshToken() {
        try {
            let tokens = await spotify_auth_api.renewAccessToken();
            spotify_auth_dal.updateTokens(tokens.access_token, tokens.refresh_token);
        } catch (error) {
            logger.error(`Refreshing token failed`, error);
            throw (Error(error));
        }

    }
}

function create(slack_controller, slack_formatter){
    return new spotifyAuthService(slack_controller, slack_formatter); 
}

module.exports = {
    create
}