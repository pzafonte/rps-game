//Initialize Database
var config = {

    apiKey: "AIzaSyAPn77ys7mS2dSElwBJXMaLDzfLthBqTxk",
    authDomain: "rps-multiplayer-61253.firebaseapp.com",
    databaseURL: "https://rps-multiplayer-61253.firebaseio.com",
    projectId: "rps-multiplayer-61253",
    storageBucket: "rps-multiplayer-61253.appspot.com",
    messagingSenderId: "239498048620"
};
firebase.initializeApp(config);

//The whole database
const database = firebase.database();
//The part of the database that keeps track of player data
const playersData = database.ref("players");
//The part of the database that keeps track of turns
const turnData = database.ref("turn");
//The part of the database that holds chat data
const chatData = database.ref("chat");
//Just establish here  that the max number of players is 2, so we can see it clearly in the game logic
const maxPlayers = 2;
//Contains snapshot of the database
let players
//The current number of current players
let numCurrPlayers;
//Used to determine if it is player 0 or player 1
let playerNumber
//tells us whose turn it is... 0's turn or 1's turn
let turn;

let chat
//Maxiumum number of chat lines
let maxChatLines = 10;

// Initalize the
playersData.on("value", function (snapshot) {
    players = snapshot.val();

    //If there are players
    if (players) {

        //Call back function for the subsquent filter that checks whether a player exists
        const doesPlayerExist = function (player) {
            return player !== -1;
        }
        numCurrPlayers = players.filter(doesPlayerExist).length;

        // Life is unfair, player one goes first...
        if (turn === null && numCurrPlayers === maxPlayers) {
            turnData.set(0);

            // If a player drops out revert turn counter to null
        } else if (numCurrPlayers < maxPlayers) {
            turnData.set(null);

            //If all players drop out delete the chatroom data
            if (numCurrPlayers === 0) {
                chatData.set(null);
            }

        }

        // Else (no players) set players to -1 to demonstrate no one is playing
    } else {
        for (let i = 0; i < maxPlayers; i++) {
            playersData.child(i).set(-1);
        }

    }

    updateDisplay();
});

// Find out whose turn it is
turnData.on("value", function (snapshot) {
    turn = snapshot.val();

    updateDisplay();
});

// Display chat messages
chatData.on("value", function (snapshot) {
    if (snapshot.val()) {
        chat = snapshot.val();
    } else {
        chat = [];
    }

    $("#chat-message-area").html(chat.join(""));
});



//RPS Game Functions
$(document).ready(function () {
    displayScreen(0);
    $("#player-name-input").focus();

    // Press enter key instead of clicking
    $("#player-name-input").on("keyup", function (event) {
        if (event.keyCode === 13) {
            addPlayer($("#player-name-input").val().trim());
        }
    });

    $("#submit-button").on("click", function () {
        addPlayer($("#player-name-input").val().trim());
    });

    $("#send-chat-message").on("keyup", function (event) {
        if (event.keyCode === 13) {
            sendMessage($("#send-chat-message").val().trim());
        }
    });
});

// check to make sure only valid characters are part of the name
function checkName(name) {
    return name.match(/^[a-z0-9]+$/i);
}

function addPlayer(name) {
    // Check to make sure there is at most 2 people playing, if more try to join provide a message
    if (numCurrPlayers >= maxPlayers) {
        $("#player-name-input").focus();
        $("#error-text").html("<p>Two people are already playing Rock Paper Scissors. Please wait for a player to leave.</p>");
        return;
    }

    // Check for valid input
    if (!checkName(name)) {
        $("#player-name-input").focus();
        $("#error-text").html("<p>Please use only letters and numbers for your player name</p>");

        return;
    }

    //Player object for firebase
    const player = {
        "name": name,
        "choice": -1,
        "wins": 0,
        "losses": 0,
        "ties": 0
    };

    // Add the player to an open spot
    for (let i = 0; i < maxPlayers; i++) {
        if (players[i] === -1) {
            playerNumber = i;

            playersData.child(playerNumber).set(player);
            playersData.child(playerNumber).onDisconnect().set(-1);

            break;
        }
    }

    displayScreen(1);
}

// Respond to clicks on dynamically generated divs
$("body").on("click", ".play", function () {
    // Record whether the player chose Rock, Paper, or Scissors
    playersData.child(`${turn}/choice`).set($(".play").index(this));

    if (turn === maxPlayers - 1) {
        let playerOne = players[0];
        let playerTwo = players[1];

        if (playerOne.choice === playerTwo.choice) {
            playersData.child(`0/ties`).set(playerOne.ties + 1);
            playersData.child(`1/ties`).set(playerTwo.ties + 1);

        } else if ((playerOne.choice - playerTwo.choice + 3) % 3 === 1) {
            playersData.child(`0/wins`).set(playerOne.wins + 1);
            playersData.child(`1/losses`).set(playerTwo.losses + 1);

        } else {
            playersData.child(`0/losses`).set(playerOne.losses + 1);
            playersData.child(`1/wins`).set(playerTwo.wins + 1);

        }

    }

    // Go to next turn
    turnData.set((turn + 1) % maxPlayers);
});

function sendMessage(message) {
    $("#send-chat-message").val("");
    $("#send-chat-message").focus();

    if (chat.length === maxChatLines) {
        chat.shift();
    }
    chat.push(`<p>${players[playerNumber].name}: ${message}</p>`);

    chatData.set(chat);
}


///Functions that update DOM display elements
function displayScreen(screen) {
    $(".screen").css({
        "display": "none"
    });
    $(`.screen:nth-of-type(${screen + 1})`).css({
        "display": "block"
    });
}

function updateDisplay() {
    // Check if player actually exists (in the game)
    if (typeof playerNumber !== "number") {
        return;
    }

    if (turn === null) {
        for (let i = 0; i < maxPlayers; i++) {
            if (players[i] !== -1) {
                $(`#player${i} > .name`).html(`<h2>${players[i].name}</h2>`);
                $(`#player${i} > .score`).html(`<p>Wins: ${players[i].wins}, Losses: ${players[i].losses}, Ties: ${players[i].ties}</p>`);
            } else {
                $(`#player${i} > .name`).html(`<h2>Waiting for Player ${i + 1} to join</h2>`);
                $(`#player${i} > .score`).html("");
            }
            $(`#player${i} > .action`).empty();
        }

    } else {
        for (let i = 0; i < maxPlayers; i++) {
            $(`#player${i} > .name`).html(`<h2>${players[i].name}</h2>`);
            $(`#player${i} > .score`).html(`<p>Wins: ${players[i].wins}, Losses: ${players[i].losses}, Ties: ${players[i].ties}</p>`);
        }

        if (turn === playerNumber) {
            $(`#player${playerNumber} > .action`).html(`<div class="play">Rock</div><div class="play">Paper</div><div class="play">Scissors</div>`);
        } else {
            $(`#player${playerNumber} > .action`).html(`<p>Waiting for ${players[turn].name} to pick.<p>`);
        }


    }
}