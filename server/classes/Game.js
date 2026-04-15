const { Chess } = require('chess.js');
const constant = require('../constants');
const RedisClient = require('../RedisClient');
const dbGame = require('../database/Models/Game.model');

class Game {
    constructor(gameid, white_id, black_id, mode, timeInMilliseconds, onEnd = () => { }) {
        this.gameid = gameid;
        this.white_id = white_id;
        this.black_id = black_id;
        this.mode = mode;

        this.chess = new Chess();
        this.fen = this.chess.fen();
        this.fenhistory = [this.fen];
        this.lastmove = null;
        this.moves = [];
        this.result = { status: constant.ONGOING, winner: null, method: null };

        this.startTime = Date.now();
        this.endTime = null;
        this.timeInMilliseconds = timeInMilliseconds;
        this.timeLeft = {
            [white_id]: timeInMilliseconds,
            [black_id]: timeInMilliseconds
        };
        this.lastMoveTimestamp = Date.now();
        this.onEnd = onEnd;
    }

    async makeMove(move, player_id) {
        try {
            if (this.result.status != constant.ONGOING) {
                return { valid: false, message: constant.GAME_ALREADY_ENDED, gameState: this.getGameState() };
            }

            const curr_turn = this.chess.turn();
            const is_white_turn = curr_turn == 'w';

            if ((is_white_turn && player_id != this.white_id) || (!is_white_turn && player_id != this.black_id)) {
                return { valid: false, message: constant.NOT_YOUR_TURN, gameState: this.getGameState() }
            }

            const now = Date.now();
            const timeSpent = now - this.lastMoveTimestamp;
            this.timeLeft[player_id] -= timeSpent;

            if (this.timeLeft[player_id] <= 0) {
                this.handleTimeout(player_id);
                await this.saveToRedis();
                return { valid: false, message: constant.TIMEOUT, gameState: this.getGameState() };
            }

            move = this.handleAutoPromotion(move);

            const move_data = this.chess.move(move);
            console.log("movedata", move_data);
            if (move_data == null) {
                return { valid: false, message: constant.INVALID_MOVE, gameState: this.getGameState() };
            }

            this.fen = this.chess.fen();
            this.fenhistory.push(this.fen);
            this.lastmove = { ...move_data, player_id: player_id, timestamp: Date.now() };
            this.moves.push(this.lastmove);
            this.lastMoveTimestamp = now;

            if (this.chess.isGameOver()) {
                await this.handleGameEnd();
            }

            await this.saveToRedis();

            return {
                valid: true,
                gameState: this.getGameState()
            }
        } catch (err) {
            console.log(err);
            return { valid: false, message: constant.ERROR, gameState: this.getGameState() };
        }

    }

    handleTimeout(playerId) {
        this.result = {
            status: constant.TIMEOUT,
            winner: {
                winner_id: playerId == this.white_id ? this.black_id : this.white_id,
                color: playerId == this.white_id ? constant.BLACK : constant.WHITE,
            },
            method: constant.TIMEOUT
        }
        this.endTime = Date.now();
    }

    async checkIfPlayerTimeOut() {
        const curr_turn = this.chess.turn();
        const is_white_turn = curr_turn == 'w';
        const player_id = is_white_turn ? this.white_id : this.black_id;
        const now = Date.now();
        const timeSpent = now - this.lastMoveTimestamp;
        if (this.timeLeft[player_id] <= timeSpent) {
            this.handleTimeout(player_id);
            await this.saveToRedis();
        }
    }

    async resign(resignedBy) {
        if (this.result.status != constant.ONGOING) return;

        this.result = {
            status: constant.RESIGN,
            winner: {
                winner_id: resignedBy == this.white_id ? this.black_id : this.white_id,
                color: resignedBy == this.white_id ? constant.BLACK : constant.WHITE,
            },
            method: constant.RESIGN,
        }

        this.endTime = Date.now();
        await this.saveToRedis();
        await this.publishEndedGame();
        return {
            result: this.result,
            gameState: this.getGameState()
        }
    }

    async handleDraw() {
        if (this.result.status != constant.ONGOING) return;

        this.result = {
            status: constant.DRAW,
            winner: null,
            method: constant.DRAW_BY_AGREEMENT,
        }

        this.endTime = Date.now();
        await this.saveToRedis();
        return {
            result: this.result,
            gameState: this.getGameState()
        }
    }

    handleAutoPromotion(move) {
        const piece = this.chess.get(move.from);
        if (piece && piece.type == 'p') {
            const targetRank = move.to[1];
            if (targetRank == '1' || targetRank == '8') {
                return {
                    ...move,
                    promotion: move.promotion || 'q',
                }
            }
        }
        return move;
    }

    getGameState() {
        return {
            gameid: this.gameid,
            white_id: this.white_id,
            black_id: this.black_id,
            mode: this.mode,
            fen: this.fen,
            history: this.chess.history(),
            fenhistory: this.fenhistory,
            moves: this.moves,
            turn: this.chess.turn(),
            lastmove: this.lastmove,
            gameOver: this.chess.isGameOver() || this.result.status !== constant.ONGOING,
            result: this.result,
            startTime: this.startTime,
            endTime: this.endTime,
            timeLeft: this.timeLeft,
            lastMoveTimestamp: this.lastMoveTimestamp,
            timeInMilliseconds: this.timeInMilliseconds
        }
    }

    async publishEndedGame() {
        console.log("handling game end");
        console.log(this.result);
        if (this.result.status != constant.ONGOING) {
            await RedisClient.publish(`gameEnded`, JSON.stringify(this.getGameState()));
            this.onEnd(this.gameid);
        }
    }

    async handleGameEnd() {
        if (this.chess.isCheckmate()) {
            this.result = {
                status: constant.CHECKMATE,
                winner: {
                    winner_id: this.chess.turn() == "w" ? this.black_id : this.white_id,
                    color: this.chess.turn() == "w" ? constant.BLACK : constant.WHITE,
                },
                method: constant.CHECKMATE
            }
        } else if (this.chess.isStalemate()) {
            this.result = {
                status: constant.DRAW,
                winner: null,
                method: constant.STALEMATE
            }
        } else if (this.chess.isInsufficientMaterial()) {
            this.result = {
                status: constant.DRAW,
                winner: null,
                method: constant.INSUFFICIENT_MATERIAL
            }
        } else if (this.chess.isThreefoldRepetition()) {
            this.result = {
                status: constant.DRAW,
                winner: null,
                method: constant.THREEFOLD_REPETITION
            }
        }

        this.endTime = Date.now();
        await this.publishEndedGame();
    }

    async saveToRedis() {
        try {
            await RedisClient.set(`game:${this.gameid}`, JSON.stringify(this.getGameState()), 'EX', 3600);
        } catch (err) {
            console.log(err);
        }
    }

    async saveToDatabase() {
        try {
            const gameDetails = await dbGame.findOne({ gameid: gameid });
            const gameObj = JSON.parse(gameDetails);
            const dbgame = new dbGame({
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
            })
            await dbgame.save();
        } catch (err) {
            console.log(err);
        }
    }

    static async loadGameFromRedis(gameid) {
        const game_data = await RedisClient.get(`game:${gameid}`);
        if (game_data == null) return null;
        const parsedgame = JSON.parse(game_data);
        const game = new Game(
            parsedgame.gameid,
            parsedgame.white_id,
            parsedgame.black_id,
            parsedgame.mode,
            parsedgame.timeInMilliseconds
        )

        game.fen = parsedgame.fen;
        game.fenhistory = parsedgame.fenhistory;
        game.moves = parsedgame.moves;
        game.lastmove = parsedgame.lastmove;
        game.result = parsedgame.result;
        game.startTime = parsedgame.startTime;
        game.endTime = parsedgame.endTime;
        game.gameOver = parsedgame.gameOver;
        game.result = parsedgame.result;
        game.timeLeft = parsedgame.timeLeft;
        game.lastMoveTimestamp = parsedgame.lastMoveTimestamp,

            game.chess.load(parsedgame.fen);
        return game;
    }

    static async loadGameFromDatabase(gameid) {
        const game_data = await RedisClient.get(`game:${gameid}`);
        if (game_data == null) return null;
        const parsedgame = JSON.parse(game_data);
        const game = new Game(
            parsedgame.gameid,
            parsedgame.white_id,
            parsedgame.black_id,
            parsedgame.mode,
            parsedgame.timeInMilliseconds
        )

        game.fen = parsedgame.fen;
        game.fenhistory = parsedgame.fenhistory;
        game.moves = parsedgame.moves;
        game.lastmove = parsedgame.lastmove;
        game.result = parsedgame.result;
        game.startTime = parsedgame.startTime;
        game.endTime = parsedgame.endTime;
        game.gameOver = parsedgame.gameOver;
        game.result = parsedgame.result;
        game.timeLeft = parsedgame.timeLeft;
        game.lastMoveTimestamp = parsedgame.lastMoveTimestamp,

            game.chess.load(parsedgame.fen);
        return game;
    }
}

module.exports = Game;
