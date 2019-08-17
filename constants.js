module.exports = {
    SCOPES : ['user-read-recently-played',
        'user-read-playback-state',
        'user-modify-playback-state',
        'playlist-read-collaborative',
        'playlist-read-private',
        'playlist-modify-public',
        'playlist-modify-private',
        'streaming'],
    CRONJOBS : {
        REFRESH: "REFRESH_CRONJOB",
        NOW_PLAYING: "NOW_PLAYING_CRONJOB",
        SEARCH_CLEAR: "SEARCH_CLEAR"
    },
    DB : {
        SETTINGS_FILE: "settings.db",
        SPOTIFY_FILE: "spotify.db",
        COLLECTION: {
            ADMIN: "admin",
            AUTH: "auth",
            BLACKLIST: "blacklist",
            CONFIG : "config",
            CURRENT_TRACK: "current_track",
            HISTORY: "history",
            NAME: "name",
            OTHER: "other",
            SEARCH: "search",
            SETTINGS : "settings",
            SKIP: "skip"
        },
        KEY: {
            BLACKLIST: "blacklist",
            CURRENT_TRACK: "current_track",
            SKIP: "skip",
            TRACK_URI: "uri",
            TRIGGER_ID: "trigger_id",
            TYPE: "type"
        }
    },
    SPOTIFY_AUTH : {
        REDIRECT_PATH: "settings/auth"
    },
    SLACK : {
        BUTTON_STYLE: {
            PRIMARY: "primary",
            DANGER: "danger"
        },
        DIALOG: {
            API: "https://slack.com/api/dialog.open",
            HINTS : {
                CHANNEL: "The channel Slackbot will restrict usage of commands to.",
                PLAYLIST: "The name of the playlist Spotbot will save to. If it does not exist Spotbot will create one for you.",
                DEFAULT_DEVICE: "This helps Spotbot with commands. Turn on your Spotify device",
                DISABLE_REPEATS : "The duration where no one can add the same song. Set it to 0 to allow repeats all the time. Integers only",
                BACK_TO_PLAYLIST: "Enables the ability for Spotify to return to the playlist if it runs out of songs AND a new song is added",
                NOW_PLAYING: "Sends a now playing message when a song changes",
                SKIP_VOTES: "The number of additional votes needed to skip a song. Integers only"
            }
        },
        PAYLOAD: {
            ADD_SONG : "ADDSONG",
            BLACKLIST : "BLACKLIST",
            BLACKLIST_REMOVE: "BLACKLIST_REMOVE",
            RESET: "RESET",
            SEE_MORE_ARTISTS: "SEEMOREARTISTS",
            SEE_MORE_BLACKLIST : "SEEMOREBLACKLIST",
            SEE_MORE_TRACKS : "SEEMORETRACKS",
            SKIP_VOTE: "SKIP_VOTE",
            SPOTBOT_CONFIG: "SPOTBOTCONFIG",
            VIEW_ARTIST : "VIEWARTIST",
            DELETABLE: ["ADDSONG", "BLACKLIST"]
        },
        POST : {
            API: "https://slack.com/api/chat.postMessage",
            EPHEMERAL: {
                API: "https://slack.com/api/chat.postEphemeral"
            } 
        }
    }
}