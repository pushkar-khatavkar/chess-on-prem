// CHANGED: rewritten as an AWS Lambda handler triggered by SQS.
// The original databaseUpdation.js was a long-running Express app
// subscribing to Redis pub/sub on the "gameEnded" channel.
// This version exports a Lambda handler that receives SQS records instead.
// All DB logic (upsert game, update Elo ratings) is identical.

const mongoose = require('mongoose');
const constant = require('./constants');
const dbGame = require('./database/Models/Game.model');
const User = require('./database/Models/User');
const EloRank = require('elo-rank');

const elo = new EloRank(15);

// Cache the DB connection across warm Lambda invocations
let cachedDb = null;

async function connectDB() {
    if (cachedDb && mongoose.connection.readyState === 1) return;
    cachedDb = await mongoose.connect(process.env.MONGODB_URL);
}

async function processGameEnded(gameObj) {
    let dbgame = await dbGame.findOne({ gameid: gameObj.gameid });

    if (dbgame) {
        dbgame.gameid = gameObj.gameid;
        dbgame.white_id = gameObj.white_id;
        dbgame.black_id = gameObj.black_id;
        dbgame.mode = gameObj.mode;
        dbgame.fen = gameObj.fen;
        dbgame.lastmove = gameObj.lastmove || {};
        dbgame.moves = gameObj.moves || [];
        dbgame.fenhistory = gameObj.fenhistory || [];
        dbgame.history = gameObj.history || [];
        dbgame.result = gameObj.result || {};
        dbgame.startTime = gameObj.startTime || new Date();
        dbgame.endTime = gameObj.endTime || null;
        dbgame.timeInMilliseconds = gameObj.timeInMilliseconds || 0;
        dbgame.timeLeft = gameObj.timeLeft || {};
        dbgame.lastMoveTimestamp = gameObj.lastMoveTimestamp || null;
        dbgame.gameOver = gameObj.gameOver || false;
        await dbgame.save();
    } else {
        dbgame = new dbGame({
            gameid: gameObj.gameid,
            white_id: gameObj.white_id,
            black_id: gameObj.black_id,
            mode: gameObj.mode,
            fen: gameObj.fen,
            lastmove: gameObj.lastmove || {},
            moves: gameObj.moves || [],
            fenhistory: gameObj.fenhistory || [],
            history: gameObj.history || [],
            result: gameObj.result || {},
            startTime: gameObj.startTime || new Date(),
            endTime: gameObj.endTime || null,
            timeInMilliseconds: gameObj.timeInMilliseconds || 0,
            timeLeft: gameObj.timeLeft || {},
            lastMoveTimestamp: gameObj.lastMoveTimestamp || null,
            gameOver: gameObj.gameOver || false
        });
        await dbgame.save();
    }

    console.log('Game saved:', dbgame.gameid);

    let player1 = await User.findOne({ _id: gameObj.white_id });
    let player2 = await User.findOne({ _id: gameObj.black_id });

    const winner = gameObj?.result?.winner?.winner_id;

    if (winner) {
        if (dbgame.mode == constant.RAPID) {
            let expectedScoreA = elo.getExpected(player1.RapidElo, player2.RapidElo);
            let expectedScoreB = elo.getExpected(player2.RapidElo, player1.RapidElo);
            if (player1._id == winner) {
                player1.RapidElo = elo.updateRating(expectedScoreA, 1, player1.RapidElo);
                player2.RapidElo = elo.updateRating(expectedScoreB, 0, player2.RapidElo);
            } else {
                player1.RapidElo = elo.updateRating(expectedScoreA, 0, player1.RapidElo);
                player2.RapidElo = elo.updateRating(expectedScoreB, 1, player2.RapidElo);
            }
        } else if (dbgame.mode == constant.BLITZ) {
            let expectedScoreA = elo.getExpected(player1.BlitzElo, player2.BlitzElo);
            let expectedScoreB = elo.getExpected(player2.BlitzElo, player1.BlitzElo);
            if (player1._id == winner) {
                player1.BlitzElo = elo.updateRating(expectedScoreA, 1, player1.BlitzElo);
                player2.BlitzElo = elo.updateRating(expectedScoreB, 0, player2.BlitzElo);
            } else {
                player1.BlitzElo = elo.updateRating(expectedScoreA, 0, player1.BlitzElo);
                player2.BlitzElo = elo.updateRating(expectedScoreB, 1, player2.BlitzElo);
            }
        } else if (dbgame.mode == constant.BULLET) {
            let expectedScoreA = elo.getExpected(player1.BulletElo, player2.BulletElo);
            let expectedScoreB = elo.getExpected(player2.BulletElo, player1.BulletElo);
            if (player1._id == winner) {
                player1.BulletElo = elo.updateRating(expectedScoreA, 1, player1.BulletElo);
                player2.BulletElo = elo.updateRating(expectedScoreB, 0, player2.BulletElo);
            } else {
                player1.BulletElo = elo.updateRating(expectedScoreA, 0, player1.BulletElo);
                player2.BulletElo = elo.updateRating(expectedScoreB, 1, player2.BulletElo);
            }
        }

        player1?.gameHistory?.push(dbgame.gameid);
        player2?.gameHistory?.push(dbgame.gameid);
        await player1.save();
        await player2.save();

        console.log('Elo updated for players:', player1._id, player2._id);
    }

    console.log(`Data uploaded successfully for game: ${gameObj.gameid}`);
}

// Lambda handler — SQS trigger
exports.handler = async (event) => {
    await connectDB();

    for (const record of event.Records) {
        try {
            const gameObj = JSON.parse(record.body);
            await processGameEnded(gameObj);
        } catch (err) {
            console.error('Error processing record:', record.messageId, err);
            // Re-throwing causes Lambda to return this record to the queue for retry.
            // If you want partial batch failure reporting, use SQS batchItemFailures instead.
            throw err;
        }
    }
};
