require('dotenv').config();
const CONSTANTS = require('./constants');
//Express and Bodyparser
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
//Load Spotify local module
const spotify = require('./core/spotifyConfig');
const spotifySetup = require('./core/spotifyConfig');
const spotifyAuth = require('./core/spotifyAuth');
const spotifyController = require('./controllers/spotifyController');
const slack = require('./slackController');
const port = process.env.PORT || 3000;
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
      res.send();
      let response = spotifyController.getThreeTracks(payload.callback_id, payload.actions[0].value);
      slack.send(response, payload.response_url);
    }
    // Add a song track button
    else if (payload.actions[0].name == CONSTANTS.ADD_SONG){
      let response = await spotifyController.addSongToPlaylist(payload.callback_id, payload.actions[0].value, payload.user, payload.channel.id);
      res.send(slack.deleteReply("ephemeral", ""));
      slack.post(response);
    }
    else if (payload.actions[0].name == CONSTANTS.SKIP){
      let response = await spotifyController.voteSkip(payload.user, payload.callback_id);
      res.send(response);
    }
    else if (payload.actions[0].name == CONSTANTS.RESET){
      let response = await spotifyController.reset();
      res.send(response);
      var params = {
        channel: payload.channel.id
      };
      params.text = `:boom: The playlist has been nuked by <@${payload.user.id}>`
      slack.post(params);
    }
  }
  else{
    if (payload.callback_id == CONSTANTS.SPOTIFY_CONFIG){
      let response = await spotifySetup.verifySettings(payload.submission);
      if (response.errors != null){
        res.send(response);
      }
      else{
        res.send();
        slack.send(response, payload.response_url);
      }
      
    }
    else{
      res.send("Inavlid Command");
    }
  }
});

app.post('/setup', async (req, res) => {
  console.log
  if (req.body.text == "setup"){
    res.send();
    let response = await spotifySetup.setup(req.body.user_id, req.body.trigger_id, req.body.response_url)
    slack.send(response, req.body.response_url);
  }
  if (req.body.text == "auth"){
    res.send();
    let response = await spotifyAuth.authenticate(req.body.trigger_id, req.body.response_url, req.body.channel_id, req.body.team_id);
    console.log(response);
    slack.send(response, req.body.response_url);
  }
  if (req.body.text == "settings"){
    res.send();
    let response = await spotifySetup.settings(req.body.trigger_id);
    if (response){
      slack.send(response, req.body.response_url);
    }
  }
});


app.get('/auth', async (req, res) => {
  if (req.query.code != null) {
    let response = await spotifyAuth.getAccessToken(req.query.code, req.query.state);
    res.redirect(response);
  } else if (req.query.error != null) {
    console.log(req.query.error);
  }
});

app.post('/play',  async (req, res) => {
  res.send(slack.reply("in_channel", ""));
  let response = await spotifyController.play();
  slack.send(response, req.body.response_url);
});

app.post('/pause', async (req, res) => {
  res.send(slack.reply("in_channel", ""));
  let response = await spotifyController.pause();
  slack.send(response, req.body.response_url);

});

app.post('/find', async (req, res) => {
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
  res.send(slack.reply("in_channel", ""));
  // "text": "<@UK70DC5LG>",
  let response = await spotifyController.find(req.body.text, req.body.trigger_id);
  slack.send(response, req.body.response_url);
}
});

app.post('/whom', async (req, res) => {
  res.send(slack.reply("in_channel", ""));
  let response = await spotifyController.whom();
  console.log(response);
  slack.send(response, req.body.response_url);
});

app.post('/skip', async (req, res) => {
  res.send(slack.reply("in_channel", ""));
  let response = await spotifyController.skip(req.body.user_id);
  slack.send(response, req.body.response_url);
});

app.post('/reset', async (req, res) => {
  res.send();
  let response = await spotifyController.resetRequest();
  slack.send(response, req.body.response_url);
})


app.listen(port, () => console.log(`App listening on port ${port}!`))