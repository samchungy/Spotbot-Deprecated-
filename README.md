<!-- PROJECT LOGO -->
<br />
<p align="center">
    <img src="https://raw.githubusercontent.com/samchungy/Spotbot/master/Spotbot-logo.png" alt="Logo" width="100" height="100">
  <h3 align="center">Spotbot</h3>

  <p align="center">
    A Spotify bot for Slack. Made for Deloitte Platform Engineering
    <br />
  </p>
</p>



<!-- TABLE OF CONTENTS -->
## Table of Contents

* [About the Project](#about-the-project)
  * [Built With](#built-with)
  * [Features]($features)
* [Getting Started](#getting-started)
  * [Prerequisites](#prerequisites)
  * [Installation](#installation)
* [Usage](#usage)
* [Contact](#contact)



<!-- ABOUT THE PROJECT -->
## About The Project

This was created in my spare time after work to add additional functionality to the Jukebot bot on Slack.

### Built With

* NodeJS 12.6
* axios
* body-parser
* dotenv
* express
* lodash
* lokijs
* momentjs
* node-schedule
* qs
* spotify-web-api-node - Custom fork.
* winston

### Features

* Create a playlist.
* Find a track by Artist or Track Name.
* Vote to skip a song with a customisable number of votes.
* Reset a playlist.
* Find out who requested a song.
* Find the current song or playlist playing.
* Set a now playing status.
* Blacklist a song.
* Restrict usage of commands to a particular channel.
* Disable repeat additions of a song.
* Return to the playlist when a song is added. By default Spotify plays a radio based on the songs currently in your playlist. This feature enables Spotify to return back to the playlist automatically when a song is added. This does not work if repeat playlist is enabled.


<!-- GETTING STARTED -->
## Getting Started

To get a local copy up and running follow these simple steps.

### Prerequisites

* Node 12.6
* npm

### Installation
 
1. Clone the repo
```sh
git clone https://github.com/samchungy/Spotbot.git
```
2. Install NPM packages
```sh
npm install
```
3. Create a .env file and replace XXX with your own tokens. SLACK_TOKEN is obtained when you install your app to Slack.
```sh
SPOTIFY_CLIENT_ID=XXX
SPOTIFY_CLIENT_SECRET=XXX
SLACK_TOKEN=XXX
SLACK_SIGNING_SECRET=XXX
```

## Usage

### Commands
* `/artist [artist name]` - Finds an artist on Spotify
* `/current track | playlist` - Find the current track/playlist playing
* `/find [track_name]` - Finds a track on Spotify
* `/pause` - Pauses Spotify
* `/play` - Plays Spotify
* `/reset` - Sets the Spotify playlist to blank
* `/skip` - Starts a vote to Skip.
* `/spotbot auth | settings | admin (add | list | remove) | blacklist (current | remove)` - Spotbot Admin panel
* `/whom` - Find out who requested a particular song. 

## Contact

Sam Chung - samchungy@gmail.com
