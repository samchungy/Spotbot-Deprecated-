<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://github.com/github_username/repo">
    <img src="https://raw.githubusercontent.com/samchungy/Spotbot/master/Spotbot-logo.png" alt="Logo" width="80" height="80">
  </a>

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

### Usage

# Commands
* `/artist [artist name]` - Finds an artist on Spotify
* `/current track | playlist` - Find the current track/playlist playing
* `/find [track_name]` - Finds a track on Spotify
* `/pause` - Pauses Spotify
* `/play` - Plays Spotify
* `/reset` - Sets the Spotify playlist to blank
* `/skip` - Starts a vote to Skip.
* `/spotbot auth | settings | admin (add | list | remove) | blacklist (current | remove)
* `/whom` - Find out who requested a particular song. 

### Contact

Sam Chung - samchungy@gmail.com
