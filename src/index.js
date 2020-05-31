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
  const wsTicket = ws.protocol;
  if (!wsTicket || wsTicket.length === 0) return ws.terminate();

  const loginDataUnparsed = await redis.get(wsTicket);
  if (!loginDataUnparsed) return ws.terminate();

  const loginData = JSON.parse(loginDataUnparsed);
  const userId = loginData.id;

  // ws.isAlive = true;
  ws.on("pong", heartbeat);

  ws.on("error", err => {
    console.log("ERROR: ", err);
  });

  ws.on("message", message => {
    console.log("MESSAGE: ", message);
  });

  ws.on("close", async () => {
    websocketsOfUsers.delete(userId);
    await logoutEvent(userId);
  });

  await loginEvent(ws, loginData);
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
