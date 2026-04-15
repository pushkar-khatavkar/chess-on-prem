const express = require('express');
const router = express.Router();
const RedisClient = require('../RedisClient');
const Auth = require("../middleware/Auth");
const { v4: uuidv4 } = require("uuid");
const constant = require('../constants');
const dbGame = require('../database/Models/Game.model');
const config = require('../config/config');

// requestIdMap --> mapping request id to client 
// requestIdResolved --> if that request id is resolved 
// queueMap:${mode} -> mapping of userid with requestid
// queue --> userid

router.post("/get-requestid", Auth, async (req,res) => {
    try {
        const requestId = uuidv4();
        const userid = req.userId;
        const { mode } = req.body;

        await RedisClient.hset("requestIdMap",requestId,JSON.stringify({userid,mode}));
        return res.status(200).send({
            requestId,
            mode,
            redirect: `/find/${mode}/${requestId}`,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send(err);
    }
})

router.post("/find-match",Auth,async(req, res) => {
    // will later have a microservice to remove user from queue which checks every 5s
    const userid = req.userId;
    const { mode,requestId } = req.body;
    const queueKey = `queue:${mode}`;
    const queueMap = `queueMap:${mode}`;
    const requestResolve = await RedisClient.hget('requestIdResolved',requestId);
    const io = req.app.get("io");

    try {
        const WaitingInQueue = await RedisClient.hget(`queueMap:${mode}`,userid);
        if(WaitingInQueue) {
            if(WaitingInQueue != requestId){
                await RedisClient.hset(`queueMap:${mode}`,userid,requestId);
                await RedisClient.hset("requestIdResolved",requestId,JSON.stringify({message : 'new request is created by same user in same mode while in queue, so prev req deleted' }));
            }
            return  res.status(200).send({ status: constant.WAITING,requestId });
        }
        const RequestResolved = JSON.parse(requestResolve);
        if(RequestResolved) return res.status(200).send({status : constant.RESOLVED,requestId});
        
        

        const luaScript = `
        local opponent = redis.call("LPOP", KEYS[1])
        local queueMap = KEYS[2]

        if opponent then
            local opponentRequestId = redis.call("HGET",queueMap,opponent)
            redis.call("HDEL",queueMap,opponent)
            return cjson.encode({userid=opponent,requestId=opponentRequestId})
        else
            local userid = ARGV[1]
            local requestId = ARGV[2] 
            redis.call("RPUSH",KEYS[1],userid)   
            redis.call("HSET",queueMap,userid,requestId)
            return nil
        end
        `;

        const opponent = await RedisClient.eval(luaScript,2,queueKey,queueMap,userid,requestId);

        if (opponent) {
            const gameid = uuidv4();

            const init_game_detail = JSON.stringify({
                gameid,
                white_id: JSON.parse(opponent).userid,
                black_id: userid,
                mode
            });
            
            await RedisClient.publish("game:new",init_game_detail);
            // will have ack method too to avoid notifying player later

            console.log(opponent);
            const opponent_socketid = await RedisClient.hget("socketMap",JSON.parse(opponent).userid);
            io.to(opponent_socketid).emit(constant.MATCH_FOUND, {
                gameid,
                white: JSON.parse(opponent).userid,
                black: userid,
                websocket_url: `http://localhost:9090`,
                redirect: `/game/${mode}/${gameid}`,
                mode : mode
            });

            const user_socketid = await RedisClient.hget("socketMap",userid);
            io.to(user_socketid).emit(constant.MATCH_FOUND,{
                gameid,
                white: JSON.parse(opponent).userid,
                black: userid,
                websocket_url: `http://localhost:9090`,
                redirect: `/game/${mode}/${gameid}`,
                mode : mode
            });

            const opponentRequestId = JSON.parse(opponent).requestId;
            console.log( opponentRequestId);
            await RedisClient.hset("requestIdResolved",requestId,init_game_detail);
            await RedisClient.hset("requestIdResolved",opponentRequestId,init_game_detail);
            await RedisClient.hdel("requestIdMap",requestId);
            await RedisClient.hdel("requestIdMap",opponentRequestId);
            
            return res.status(200).send({ status: constant.MATCH_FOUND,gameid });
        } else {
            return res.status(200).send({ status: constant.WAITING,requestId });
        }
    } catch (err) {
        return res.status(500).send(err);
    }
})

router.get('/chess-quotes',async (req,res) => {
    try {
        let quotes = await RedisClient.get('chess:quotes');
        let random;

        if (quotes) {
            quotes = JSON.parse(quotes);
            random = quotes[Math.floor(Math.random() * quotes.length)];
        } else {
            const response = await fetch("https://raw.githubusercontent.com/datavizard/chess-quotes-api/master/quotes.json");
            if (!response.ok) {
                throw new Error(`Failed to fetch quotes: ${response.status} ${response.statusText}`);
            }
            quotes = await response.json();
            random = quotes[Math.floor(Math.random() * quotes.length)];
            await RedisClient.set('chess:quotes',JSON.stringify(quotes),"EX",60 * 60 * 24);
        }
        return res.status(200).send(random);
    } catch (err) {
        console.error(err);
        return res.status(500).send(err);
    }
})

router.post("/remove-from-queue",Auth,async (req,res) => {
    const userid = req.userId;
    const { mode,requestId } = req.body;

    const queueKey = `queue:${mode}`;
    const queueMap = `queueMap:${mode}`;

    try {
        const waitingInQueue = await RedisClient.hget(queueMap,userid);
        if (!waitingInQueue) {
            return res.status(200).send({ status: constant.NOT_IN_QUEUE });
        }

        const luaScript = `
            local queueKey = KEYS[1]
            local queueMap = KEYS[2]
            local userid = ARGV[1]


            local list = redis.call("LRANGE",queueKey,0,-1)
            for i=1,#list do
                if list[i] == userid then
                    redis.call("LREM",queueKey,0,list[i])
                    break
                end
            end

            redis.call("HDEL",queueMap,userid)
            return 1
        `;

        await RedisClient.eval(luaScript,2,queueKey,queueMap,userid);
        await RedisClient.hset("requestIdResolved",requestId,JSON.stringify({message : "Removed from queue"}));
        await RedisClient.hdel("requestIdMap",requestId);

        return res.status(200).send({ status: constant.REMOVED_FROM_QUEUE });
    } catch (err) {
        console.error(err);
        return res.status(500).send(err);
    }
})

router.get("/review/:gameid",async(req,res) => {
    try {
      const { gameid } = req.params;
  
      if(!gameid) {
        return res.status(400).send({ error: "Gameid is required" });
      }
  
      const game = await dbGame.findOne({ gameid });
  
      if(!game) {
        return res.status(404).send({ error: "Game not found" });
      }
  
      res.status(200).send(game);
    } catch(err) {
      console.log(err);
      res.status(500).send(err);
    }
  })

  router.post('/generate-invite-url',async(req,res)=>{
    try{
        const uuid = uuidv4();
        const {mode} = req.body;
        // game:uuid -> {mode,player1=null,player2=null} to redis invite map and ttl is 10 min
        await RedisClient.hset(`gameInvite:${uuid}`,{
            mode: mode,
            player1: '',
            player2: ''
          });
          await RedisClient.expire(`gameInvite:${uuid}`,600);
        return res.status(200).send({
            redirect : `${config.FRONTEND_URL}/invite/${uuid}`,
            invite : uuid,
            message : 'game will be initiated between first 2 players to hit invite url and link will be expired in 10 mins'
        })
    }catch(err){
        console.log(err);
        res.status(500).send(err);
    }
  })

  router.get('/invite/:inviteid',Auth,async(req,res) => {
    try {
        const userid = req.userId;
        const inviteid = req.params.inviteid;
        const gameKey = `gameInvite:${inviteid}`;
        console.log(gameKey);
        const io = req.app.get("io");

        const script = `
        local gameKey = KEYS[1]
        local userid = ARGV[1]

        if redis.call("EXISTS",gameKey) == 0 then
            return "expired"
        end

        local player1 = redis.call("HGET",gameKey,"player1")
        local player2 = redis.call("HGET",gameKey,"player2")

        if not player1 or player1 == "" then
            redis.call("HSET",gameKey,"player1",userid)
            return "player1"
        elseif not player2 or player2 == "" then
            redis.call("HSET", gameKey,"player2",userid)
            return "player2"
        else
            return "full"
        end
        `;

        const assigned = await RedisClient.eval(script,1,gameKey,userid);

        if (assigned == "expired") {
            return res.status(400).send({ message: "Game invite expired or does not exist" });
        }
        if (assigned == "full") {
            return res.status(400).send({ message: "Game already full" });
        }

        const game = await RedisClient.hgetall(gameKey);

        const player1Socket = await RedisClient.hget("socketMap",game.player1);
        const player2Socket = await RedisClient.hget("socketMap",game.player2);


        if(game.player1 && game.player2) {
            const init_game_detail = JSON.stringify({
                gameid : inviteid,
                white_id: game.player1,
                black_id: game.player2,
                mode : game.mode
            })
            
            await RedisClient.publish("game:new",init_game_detail);
            const payload = {
                gameid: inviteid,
                white: game.player1,
                black: game.player2,
                websocket_url: `http://localhost:9090`,
                redirect: `/game/${game.mode}/${inviteid}`,
                mode: game.mode
            }

            io.to(player1Socket).emit(constant.MATCH_FOUND,payload);
            io.to(player2Socket).emit(constant.MATCH_FOUND,payload);
        }

        res.status(200).send({ status : 'success' });
        } catch (err) {
        console.log(err);
        res.status(500).send(err);
        }
    })
module.exports = router;
