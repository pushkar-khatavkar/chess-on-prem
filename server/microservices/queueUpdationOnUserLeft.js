const express = require('express');
const app = express();
const cors = require('cors');
const constant = require('../constants');
const RedisClient = require('../RedisClient');

app.use(cors({
    origin: `${config.FRONTEND_URL}`,
    credentials: true
}));
app.use(express.json());

const PORT = 8452;



app.listen(PORT,()=>{
    console.log(`listening on PORT ${PORT}`);
})