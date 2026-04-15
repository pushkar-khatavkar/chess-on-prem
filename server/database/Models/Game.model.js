const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
    gameid : {
        type : String,
    },
    white_id : {
        type : String,
    },black_id : {
        type : String,
    },
    mode : {
        type : String,
    },
    fen : {
        type : String,
    },
    lastmove : {
        type :Object,
    },
    moves : {
        type : [Object]
    },
    fenhistory : {
        type : [String],
    },
    history : {
        type : [String]
    },
    result : {
        type : Object,
    },
    startTime : {
        type : Date
    },
    endTime : {
        type : Date,
    },
    timeInMilliseconds : {
        type : Number
    },
    timeLeft : {
        type : Object
    },
    lastMoveTimestamp : {
        type : Date,
    },
    gameOver : {
        type : Boolean
    }

})

const dbGame = mongoose.model('dbGame',GameSchema);
module.exports = dbGame;