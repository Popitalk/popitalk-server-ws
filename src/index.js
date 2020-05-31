const WebSocket = require("ws");
const config = require("./config");
const redis = require("./redis");
const { websocketsOfUsers } = require("./state");
require("./pubSub");

const wss = new WebSocket.Server({ host: config.host, port: config.port });

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
  const userId = loginData.userId;

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

wss.on("listening", x => {
  console.log(
    `WS Server is running on ${wss.options.host}:${wss.options.port} in ${config.mode} mode`
  );
  // `WS Server is running on ${conf} in ${config.mode} mode`
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
