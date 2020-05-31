const WebSocket = require("ws");
const config = require("./config");
const redis = require("./redis");
const { websocketsOfUsers } = require("./state");
require("./pubSub");

const wss = new WebSocket.Server({ port: config.port });

function noop() {}

function heartbeat() {
  this.isAlive = true;
}

wss.on("connection", async ws => {
  console.log("PROTOCOL", ws.protocol);
  // const wsTicket = ws.protocol;
  // const loginDataUnparsed = await redis.get(wsTicket);
  // const loginData = JSON.parse(loginDataUnparsed);
  // If doesn't exist ^, then ws.terminate();
  const userId = 123;

  ws.isAlive = true;
  ws.on("pong", heartbeat);

  ws.on("error", err => {
    console.log("HANDLING ERROR");
  });

  ws.on("message", message => {
    console.log("received: %s", message);
  });

  ws.on("close", () => {
    // websocketsOfUsers.delete(userId);
    // logoutEvent(userId);
  });

  // ws.send("something");
  // await loginEvent(ws, userId)
});

const interval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping(noop);
  });
}, config.heartbeatInterval);

wss.on("close", () => {
  clearInterval(interval);
});
