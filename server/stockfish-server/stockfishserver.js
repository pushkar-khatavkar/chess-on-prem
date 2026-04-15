require('dotenv').config();
const express = require('express');
const http = require('http');
const app = express();
const config = require('../config/config');
const socketio = require('socket.io');
const cors = require('cors');
const constant = require('../constants');
const GameRegistry = require('../classes/GameRegistry');
const {getBestMove} = require('./stockfish');
const { v4: uuidv4 } = require("uuid");
const Auth = require('../middleware/Auth');
const RedisClient = require('../RedisClient');
const jwt = require("jsonwebtoken");
const createStockfishUser = require('./CreateStockfishUser');

app.use(cors({
    origin: `${config.FRONTEND_URL}`,
    credentials: true
}));
app.use(express.json());

const server = http.createServer(app);

const io = socketio(server,{
    cors: {
        origin: `${config.FRONTEND_URL}`,
        credentials: true
    }
});

const PORT = process.env.PORT || 8081;
const STOCKFISH_USER_ID = '68c6ae4bae31a4d4e1d19477'; // createStockfishUser();

const gameRegistry = new GameRegistry();

app.post('/api/stockfish/create-stockfish-game',Auth,async (req,res)=>{
   try{
        const userid = req.userId;
        const {depth,isWhite} = req.body;
        const gameid = uuidv4();
        const white_id = isWhite ? userid : STOCKFISH_USER_ID;
        const black_id = isWhite ? STOCKFISH_USER_ID : userid;
        const game = await gameRegistry.createGame(gameid,white_id,black_id,constant.STOCKFISH_GAME_MODE,Number.MAX_SAFE_INTEGER);
        const init_game_detail = JSON.stringify({
            gameid,
            white_id,
            black_id
        })
        await RedisClient.hset(`stockfishdepth`,gameid,depth);
        return res.status(200).send(init_game_detail);  
   }catch(err){
    res.status(400).send(err);
    console.log(err);
   }
})

io.on('connection',async(socket)=>{
    const token = socket.handshake.query.token;
    const decoded = jwt.verify(token,config.JWT_TOKEN_SECRET);
    const userid = decoded.user_id;
    const gameid = socket.handshake.query.gameid;
    const depth = await RedisClient.hget('stockfishdepth',gameid) || 15;
    console.log(depth)
    const game = await gameRegistry.getGame(gameid);
    if(game){
        if(game.white_id == STOCKFISH_USER_ID){
            const gameState = game.getGameState();
            const stockfishMove = await getBestMove(gameState?.fen,depth);
            const stockfishresult = await game.makeMove(stockfishMove,STOCKFISH_USER_ID);
            socket.emit(constant.NEW_MOVE, stockfishresult ?? { valid: false, message: constant.ERROR, gameState: game.getGameState() });
        }
    }

    socket.on(constant.NEW_MOVE,async(data)=>{
        const move = data;
        let result = null;

        if(game) result = await game.makeMove(move,userid);
        else result = {message : constant.GAME_NOT_FOUND};
        if(result == undefined) result = {valid : false, gameState : game.getGameState()};
        socket.emit(constant.NEW_MOVE,result);
        if(result?.valid && !result?.gameState?.gameOver){
            const stockfishMove = await getBestMove(result?.gameState?.fen,depth);
            const stockfishresult = await game.makeMove(stockfishMove,STOCKFISH_USER_ID);
            socket.emit(constant.NEW_MOVE, stockfishresult ?? { valid: false, message: constant.ERROR, gameState: game.getGameState() });
        }
    })

    socket.on(constant.RESIGN,async()=>{
        let result = null;

        if(game) result = await game.resign(userid);
        else result = {message : constant.GAME_NOT_FOUND};

        socket.emit(constant.RESIGN,result);
    })

    socket.on(constant.GET_GAME_STATE,async (data,ack) => {
        let result = null;
    
        if (game) result = game.getGameState();
        else result = { message: constant.GAME_NOT_FOUND };

        ack(result);
    });

    socket.on('disconnect',()=>{})
})

server.listen(PORT,() => {
    console.log(`listening on port ${PORT}`)
})
