require('dotenv').config();
//Express and Bodyparser
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
//Load Slack Node SDK
const { WebClient } = require('@slack/web-api');
const { createMessageAdapter } = require('@slack/interactive-messages');
const web = new WebClient(process.env.SLACK_TOKEN);
const slackInteractions = createMessageAdapter(process.env.SLACK_SIGNING_SECRET);

//Load Spotify local module
const spotify = require('./spotify');
const port = process.env.PORT || 3000;
// The current date
const currentTime = new Date().toTimeString();

(async () => {

  try {
    const res = await web.auth.test();
    // Use the `chat.postMessage` method to send a message from this app
    await web.chat.postMessage({
      channel: process.env.SLACK_CHANNEL,
      text: `The current time is ${currentTime}`,
    });
    console.log('Message posted!');

  } catch (error) {
    console.log('Message Failed: ' + error);
  }
})();

// Handle interactions from messages with a `callback_id` of `welcome_button`
slackInteractions.action('welcome_button', (payload, respond) => {
  // `payload` contains information about the action
  // see: https://api.slack.com/docs/interactive-message-field-guide#action_url_invocation_payload
  console.log(payload);

  // `respond` is a function that can be used to follow up on the action with a message
  respond({
    text: 'Success!',
  });

  // The return value is used to update the message where the action occurred immediately.
  // Use this to items like buttons and menus that you only want a user to interact with once.
  return {
    text: 'Processing...',
  }
});

// Handle interactions from messages with a `callback_id` of `welcome_button`
slackInteractions.action('welcome_button', (payload, respond) => {
  // `payload` contains information about the action
  // see: https://api.slack.com/docs/interactive-message-field-guide#action_url_invocation_payload
  console.log(payload);

  // `respond` is a function that can be used to follow up on the action with a message
  respond({
    text: 'Success!',
  });

  // The return value is used to update the message where the action occurred immediately.
  // Use this to items like buttons and menus that you only want a user to interact with once.
  return {
    text: 'Processing...',
  }
});

app.use('/slack/actions', slackInteractions.expressMiddleware());
// Example: If you're using a body parser, always put it after the message adapter in the middleware stack
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.post('/play', function (req, res) {
  console.log(req.body);
  res.send(
    {
      "text": "It's 80 degrees right now.",
      "attachments": [
          {
              "text":"Partly cloudy today and tomorrow"
          }
      ]
  }
  );
})

app.get('/auth', function (req, res){
  if (req.query.code != null){
    spotify.get_access_token(req.query.code);
  }
  else if (req.query.error != null){
    console.log(req.query.error);
  }
  res.sendStatus(200);
});


app.listen(port, () => console.log(`App listening on port ${port}!`))