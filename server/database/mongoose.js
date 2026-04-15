const mongoose = require("mongoose");
const config = require("../config/config");


async function connectMongoDB(){
    try{
        await mongoose.connect(`${config.MONGODB_URL}`);
        console.log("mongodb connected successfully");
    }catch(err){
        console.log("mongodb connection error:",err);
    }
}
module.exports = connectMongoDB;