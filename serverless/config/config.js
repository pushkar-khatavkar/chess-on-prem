// CHANGED: added AWS_REGION and GAME_ENDED_QUEUE_URL for SQS integration.
// All other values are unchanged.

const config = {
    PORT: process.env.PORT || 8080,
    FRONTEND_URL: process.env.FRONTEND_URL,
    MONGODB_URL: process.env.MONGODB_URL,
    NODEMAIL_APP_PASSWORD: process.env.NODEMAIL_APP_PASSWORD,
    JWT_TOKEN_SECRET: process.env.JWT_TOKEN_SECRET,
    JWT_TOKEN_SIGNUP_MAIL_SECRET: process.env.JWT_TOKEN_SIGNUP_MAIL_SECRET,
    JWT_RESET_PASSWORD_SECRET: process.env.JWT_RESET_PASSWORD_SECRET,
    REDIS_URL: process.env.REDIS_URL,
    NODEMAILER_MAIL: process.env.NODEMAILER_MAIL,
    STOCKFISH_EMAIL: process.env.STOCKFISH_EMAIL,
    STOCKFISH_PASSWORD: process.env.STOCKFISH_PASSWORD,
    // CHANGED: new AWS-specific env vars
    AWS_REGION: process.env.AWS_REGION,
    GAME_ENDED_QUEUE_URL: process.env.GAME_ENDED_QUEUE_URL,
}

module.exports = config;
