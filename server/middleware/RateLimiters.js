// reference : https://medium.com/@ignatovich.dm/creating-a-simple-api-rate-limiter-with-node-a834d03bad7a
const rateLimit = require('express-rate-limit');

const LoginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 5,
  message: "Too many login attempts, please try again after a minute"
})

const SignupLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, 
    max: 5,
    message: "Too many signup attempts, please try again after a minute"
})

module.exports = {LoginLimiter,SignupLimiter};