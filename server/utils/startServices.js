const connectMongoDB = require('../database/mongoose');
const RedisClient = require('../RedisClient');
const initRedisQueues = require("../utils/initRedisQueues");

async function startServices(){
    try{
        await Promise.all([
            waitForRedisReady(),
            connectMongoDB()
        ]);
        await initRedisQueues();
    }catch(err){
        console.log(err);
        process.exit(1);
    }
}

async function waitForRedisReady() {
    if(RedisClient.status == 'ready') return;
    await new Promise((resolve,reject) => {
        RedisClient.once('ready',resolve);
        RedisClient.once('error',reject);
    });
}

module.exports = startServices;