const WebSocket = require("ws");
const config = require("./config");
const redis = require("./redis");
const state = require("./state");
const loginEvent = require("./loginEvent");
const logoutEvent = require("./logoutEvent");
const { WS_EVENTS } = require("./constants");
require("./pubSub");

const wss = new WebSocket.Server({ host: config.host, port: config.port });

wss.on("connection", async ws => {
  const wsTicket = ws.protocol;
  if (!wsTicket || wsTicket.length === 0) return ws.terminate();

  const loginDataUnparsed = await redis.get(wsTicket);
  if (!loginDataUnparsed) return ws.terminate();

  const loginData = JSON.parse(loginDataUnparsed);
  const userId = loginData.userId;

  ws.on("error", err => {
    console.log("ERROR: ", err);
  });

  ws.on("message", message => {
    const parsedMessage = JSON.parse(message);
    const messageType = parsedMessage.type;
    if (messageType === WS_EVENTS.PONG) {
      ws.isAlive = true;
    }
  });

  ws.on("close", async () => {
    state.websockets.delete(userId);
    await logoutEvent(userId);
  });

  await loginEvent(ws, loginData);
});

wss.on("listening", () => {
  console.log(
    `WS Server is running on ${wss.options.host}:${wss.options.port} in ${config.mode} mode`
  );
});

const interval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;

    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: WS_EVENTS.PING }));
    }
  });
}, config.heartbeatInterval);

wss.on("close", () => {
  clearInterval(interval);
});
