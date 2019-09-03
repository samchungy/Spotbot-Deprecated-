require('dotenv').config();
//Express and Bodyparser
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
//Load Spotify local module
const port = process.env.PORT || 3000;
const logger = require('./log/winston');
const index = require('./index');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.raw());

app.use('/', index);

app.listen(port, () => logger.info(`App listening on port ${port}!`))