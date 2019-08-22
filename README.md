<!-- PROJECT LOGO -->
<br />
<p align="center">
    <img src="https://raw.githubusercontent.com/samchungy/Spotbot/master/Spotbot-logo.png" alt="Logo" width="100" height="100">
  <h3 align="center">Spotbot</h3>

  <p align="center">
    A Spotify bot for Slack
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

* Find a song by track name or artist.
* Play, pause or vote to skip a track.
* Reset the playlist
* Find the current song or playlist playing.
* Find out who requested a song.
* Set a now playing status.
* Blacklist a song.
* Disable repeat additions of a song.
* Restrict usage of commands to a particular Slack channel.
* Ability to return to the playlist when a new song is added. By default, Spotify can play a radio 
* Return to the playlist automatically when a new song is added. _By default Spotify plays a radio based on the songs currently in your playlist when it runs out of songs_


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
* Find a track
   * `/find [track name]` - Find a track on Spotify
   * `/findpop [track name]` - Finds a track on Spotify sorted by Popularity
   * `/artist [artist name]` - Find a track by an artist on Spotify
* Playback Status
   * `/current track | playlist` - Show the current playing track or playlist
   * `/whom - Show who requested` the current song
* Control
   * `/play` - Hits play on Spotify
   * `/pause` - Hits pause on Spotify
   * `/skip` - Vote to skip a song
   * `/reset` - Nuke the playlist
* Admin Commands
   * `/spotbot auth` - Configure authorization wtih Spotify
   * `/spotbot settings` - Configure Spotbot settings
   * `/spotbot admin add [@user]` - Add a user as a Spotbot admin
   * `/spotbot admin remove [@user]` - Remove a user as a Spotbot admin
   * `/spotbot admin list` - List all Spotbot admins
   * `/spotbot blacklist current` - Blacklists and skips the current song
   * `/spotbot blacklist remove` - Lists songs to remove from the Blacklist

## Contact

Sam Chung - samchungy@gmail.com
