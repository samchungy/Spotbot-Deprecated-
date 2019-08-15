const express = require('express');
const router = express.Router();

const admin_controller = require('../admin/adminController');
const settings_controller = require('../settings/settingsController');
const slack_controller = require('../slack/slackController');
const spotify_auth_controller = require('../spotify/auth/spotifyAuthController.js');

router.get('/auth', spotify_auth_controller.getTokens);

// Publicly ack the commands
router.use(slack_controller.isFromSlack)

router.post('/options', settings_controller.getOptions);

router.use(spotify_auth_controller.isAuth, admin_controller.isAdmin);

router.post('/', async(req, res) => {
  res.send();
  if (req.body.text == "auth"){
    await spotify_auth_controller.setupAuth(req, res);
    await admin_controller.initAdmin(req, res);
  } else if (req.body.text == "settings") {
      await settings_controller.settings(req, res);
  } else {
    let array = req.body.text.split(" ");
    if (array) {
      if (array[0] == "admin") {
        await admin_controller.adminMenu(req, res, array);
      }
    }
  }
});

// router.post('/settings', slackAuth.isAdmin, async (req, res) => {
//     if (req.body.text == "auth") {
//         logger.info("Auth Slash Command Used");
//         res.send();
//         await spotifySetup.setup_auth(req.body.trigger_id, req.body.response_url, req.body.channel_id, req.headers.host, req.body.user_name);
    
//       } else if (req.body.text == "settings") {
//         res.send();
//         if (spotifyAuth.isAuthed2(req.body.response_url)) {
//           logger.info("Settings Slash Command Used");
//           await spotifySetup.settings(req.body.trigger_id);
//         }
//       } else {
//         let array = req.body.text.split(" ");
//         if (array) {
//           if (array[0] == "admin") {
//             logger.info("Admin Slash Command Used");
//             if (array[1]) {
//               if (array[1] == "add") {
//                 res.send();
//                 spotifySetup.addAdmin(array[2], req.body.response_url);
//               } else if (array[1] == "remove") {
//                 res.send();
//                 spotifySetup.removeAdmin(array[2], req.body.user_name, req.body.response_url);
//               } else if (array[1] == "list") {
//                 res.send();
//                 spotifySetup.getAdmins(req.body.response_url);
//               }
//             }
//           }
//         }
//       }
//       });

module.exports = router;