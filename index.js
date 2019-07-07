require('dotenv').config();
const CONSTANTS = require('./constants');
//Express and Bodyparser
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

//Load Spotify local module
const spotify = require('./spotifyController');
const spotifySetup = require('./spotifyConfig');
const port = process.env.PORT || 3000;
// The current date
const currentTime = new Date().toTimeString();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

/**
 * Slack button actions all flow here
 */
app.post('/slack/actions', async (req, res) =>{
  console.log("Slack ACtion Button Pressed");
  var payload = JSON.parse(req.body.payload);
  if (payload.actions != null && payload.actions.length > 0){
    // See more tracks button action
    if (payload.actions[0].name == CONSTANTS.SEE_MORE_TRACKS){
      var response = spotify.getThreeTracks(payload.callback_id);
      res.send(response);
    }
    // Add a song track button
    if (payload.actions[0].name == CONSTANTS.ADD_SONG){
      var response = spotify.addSongToPlaylist(payload.callback_id, payload.actions[0].value, payload.user);
      res.send(response);
    }
  }
  else{
    res.send("Invalid action");
  }
});

app.post('/setup', (req, res) => {
  if (req.body.text == "setup"){
    console.log(req.body);
    res.send(spotifySetup.setup(req.body.user_id, req.body.trigger_id, req.body.response_url));
  }
  if (req.body.text == "authenticate"){
    
  }
});


app.get('/auth', (req, res) => {
  if (req.query.code != null) {
    spotifySetup.getAccessToken(req.query.code);
    res.send("<script> window.close(); </script>");
  } else if (req.query.error != null) {
    console.log(req.query.error);
  }
});

app.post('/play',  async (req, res) => {
  console.log(req.body);
  let playinfo = await spotify.play();
  res.send({
    "response_type": "in_channel",
    "text": playinfo
  });
});

app.post('/pause', async (req, res) => {
  let pauseinfo = await spotify.pause();
  res.send({
    "response_type": "in_channel",
    "text": pauseinfo
  });
});

app.post('/find', async (req, res) => {
  console.log(req.body);
  if (req.body.text == ""){
    res.send({
      "text": "I need a search term... :face_palm:",
      "attachments":[
        {
          image_url: 'https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif'
        }
      ]
    });
  }
else {
  // "text": "<@UK70DC5LG>",
  let findinfo = await spotify.find(req.body.text, req.body.trigger_id);
  res.send(findinfo);
}
});


app.listen(port, () => console.log(`App listening on port ${port}!`))