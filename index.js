require('dotenv').config();
const CONSTANTS = require('./constants');
//Express and Bodyparser
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
//Load Spotify local module
const port = process.env.PORT || 3000;
const logger = require('./log/winston');
const spotify_index = require('./components/spotify/spotifyIndex');
const settings_index = require('./components/settings/settingsIndex');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.raw());

app.use('/settings', settings_index);
app.use('/', spotify_index);

app.listen(port, () => logger.info(`App listening on port ${port}!`))