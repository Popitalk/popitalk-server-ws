const { resolve } = require("path");
require("dotenv").config({ path: resolve(__dirname, "../.env") });

module.exports = {
  mode: process.env.NODE_ENV,
  host: process.env.HOST,
  port: process.env.PORT,
  redisHost: process.env.REDIS_HOST,
  redisPort: process.env.REDIS_PORT,
  redisIndex: process.env.REDIS_DATABASE,
  redisPassword: process.env.REDIS_PASSWORD,
  heartbeatInterval: process.env.WS_HEARTBEAT_INTERVAL
};
