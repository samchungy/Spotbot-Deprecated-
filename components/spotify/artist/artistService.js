const _ = require('lodash');

const logger = require('../../../log/winston');
const CONSTANTS = require('../../../constants');
const artist_api = require('./artistAPI');
const artist_dal = require('./artistDAL');
const slack_controller = require('../../slack/slackController');
const slack_formatter = slack_controller.slack_formatter;

async function findArtist(query, trigger_id, response_url) {
    try {
        logger.info(`Find artists for query "${query}" triggered.`);
        let search_results = await artist_api.getArtists(query);
        let search_artists = _.get(search_results, 'body.artists.items');
        if (search_artists.length == 0) {
            //No Artists found
            await slack_controller.reply(`:slightly_frowning_face: No artists found for the search term "${query}". Try another search?`, null, response_url);
            return;
        } else {
            // Store in our db
            artist_dal.createArtistSearch(trigger_id, search_artists, Math.ceil(search_artists.length / 3));
            await getThreeArtists(trigger_id, 1, response_url);
            return;
        }
    } catch (error) {
        logger.error(`Find artist failed - `, error);
        await slack_controller.reply(`:slightly_frowning_face: Find artists failed. `, null, response_url);
    }
}

async function getThreeArtists(trigger_id, page, response_url) {
    try {
        var search = artist_dal.getSearch(trigger_id);

        // Searches expire after X time.
        if (search == null) {
            await slack_controller.reply(`:slightly_frowning_face: I'm sorry, your search expired. Please try another one.`, null, response_url);
            return;
        }
        // Our search has hit the end, remove it.
        if (_.get(search, 'artists.length') == 0) {
            artist_dal.deleteSearch(search);
            await slack_controller.reply(`:information_source: No more artists. Try another search.`, null, response_url);
            return;
        }
        // Make sure it is an int.
        page = parseInt(page);

        // Get 3 tracks of the search
        var current_artists = search.artists.splice(0, 3);
        var slack_attachments = []
        for (let artist of current_artists) {
            let image = (_.get(artist,"images[0]")) ? artist.images[0].url : "";
            let genres = ((_.get(artist, "genres")) && artist.genres.length != 0) ? _.map(artist.genres, _.startCase).join(', ') : "Unknown";
            slack_attachments.push(
                new slack_formatter.trackAttachment(`:musical_note: *Genres* ${genres}\n\n :busts_in_silhouette: *Followers* ${artist.followers.total}`, 
                    artist.name, trigger_id, "View artist tracks", CONSTANTS.SLACK.BUTTON_STYLE.PRIMARY, CONSTANTS.SLACK.PAYLOAD.VIEW_ARTIST, 
                        artist.name, image, artist.name, artist.external_urls.spotify).json
            );
        }
        // Update DB
        artist_dal.updateSearch(search);

        slack_attachments.push(
            new slack_formatter.buttonAttachment(`Page: ${page}/${search.total_pages}`, "See more artists", trigger_id, "See more artists", 
                null, CONSTANTS.SLACK.PAYLOAD.SEE_MORE_ARTISTS, page+1).json
        );
        await slack_controller.reply(`:mag: Are these the tracks you were looking for?`, slack_attachments, response_url);
        return;
    } catch (error) {
        logger.error(`Failed to get 3 more artists- `, error);
    }
    return;
}

function deleteArtist(trigger_id){
    try {
        var search = artist_dal.getSearch(trigger_id);
        if (search != null){
            artist_dal.deleteSearch(search);
        }
    } catch (error) {
        logger.error(`Artist to find track failed`, error);
    }

}

module.exports = {
    findArtist,
    getThreeArtists,
    deleteArtist
}