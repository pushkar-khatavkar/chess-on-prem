require('dotenv').config();
const express = require('express');
const http = require('http');
const app = express();
const config = require('../config/config');
const socketio = require('socket.io');
const cors = require('cors');
const constant = require('../constants');
const RedisClient = require('../RedisClient');
const GameRegistry = require('../classes/GameRegistry');
const jwt = require("jsonwebtoken");

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

const PORT = process.env.PORT || 9090;

const gameRegistry = new GameRegistry();


const subscriber = RedisClient.duplicate();

subscriber.on('message',(channel,message) => {
    if (channel == 'game:new') {
        try {
            if (!message) return;
            const data = JSON.parse(message);
            const { gameid,white_id,black_id,mode } = data;
            gameRegistry.createGame(gameid,white_id,black_id,mode);
            console.log('Game created:', data);
        } catch (err) {
            console.error(err);
        }
    }
});

subscriber.subscribe('game:new').then(() => {
    console.log('Subscribed to game:new channel');
}).catch(err => {
    console.log(err);
});

io.on('connection',async(socket)=>{
    const token = socket.handshake.query.token;
    const decoded = jwt.verify(token,config.JWT_TOKEN_SECRET);
    const userid = decoded.user_id;
    const gameid = socket.handshake.query.gameid;
    const game = await gameRegistry.getGame(gameid);
    // gameRegistry.createGame ?? if client hit before pub/sub worked then ?? 
    // will take mode,opponent from handshake incase after frontend testing
    socket.join(gameid);

    socket.on(constant.NEW_MOVE,async(data)=>{
        const move = data;
        let result = null;

        if(game) result = await game.makeMove(move,userid);
        else result = {message : constant.GAME_NOT_FOUND};
        if(result == undefined) result = {valid : false, gameState : game.getGameState()}; // else invlid move throwing error

        io.to(gameid).emit(constant.NEW_MOVE,result);
    })

    socket.on(constant.RESIGN,async()=>{
        let result = null;

        if(game) result = await game.resign(userid);
        else result = {message : constant.GAME_NOT_FOUND};

        io.to(gameid).emit(constant.RESIGN,result);
    })

    socket.on(constant.GET_GAME_STATE,async (data,ack) => {
        let result = null;
    
        if (game) result = game.getGameState();
        else result = { message: constant.GAME_NOT_FOUND };

        ack(result);
    })

    // socket.on(constant.DRAW_OFFER,()=>{
    //     socket.to(gameid).emit(constant.DRAW_OFFER);
    // })

    socket.on('disconnect',()=>{})
})

server.listen(PORT,() => {
    console.log(`listening on port ${PORT}`)
})