const connectMongoDB = require('../database/mongoose');
const User = require('../database/Models/User');
const config = require('../config/config');

async function createStockfishUser() {
    try {
        await connectMongoDB();
        const existing = await User.findOne({ email: config.STOCKFISH_EMAIL });
        if (existing) {
            return existing._id.toString();
        }

        const stockfishUser = new User({
            name: 'Stockfish',
            email: config.STOCKFISH_EMAIL,
            password: config.STOCKFISH_PASSWORD,
            isVerified: true,
            RapidElo: 3400,
            BlitzElo: 3400,
            BulletElo: 3400,
            profilePic: 'https://stockfishchess.org/images/logo/icon_512x512@2x.webp',
        })

        await stockfishUser.save();
        return stockfishUser._id.toString();
    } catch (err) {
        console.log(err);
    }
}
module.exports = createStockfishUser;