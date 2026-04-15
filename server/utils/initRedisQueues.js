const RedisClient = require('../RedisClient');

async function initRedisQueues() {
    await initQueue('queue:rapid');
    await initQueue('queue:blitz');
    await initQueue('queue:bullet');
}

async function initQueue(queue) {
    try {
        const exist = await RedisClient.exists(queue);
        if(!exist){
            await RedisClient.multi().rpush(queue,'__init__').lpop(queue).exec();
            console.log(`${queue} created`);
        }
        
    } catch (err) {
        console.log(err);
    }
}

module.exports = initRedisQueues;