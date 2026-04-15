const {Redis} = require('ioredis');
const config = require('./config/config');

const RedisClient = new Redis(config.REDIS_URL);

RedisClient.on("connect",() => {
    console.log("Redis connected successfully");
});
  
RedisClient.on("error",(err) => {
    console.log("Redis connection error:",err);
});

module.exports = RedisClient;