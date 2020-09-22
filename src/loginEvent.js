/* eslint-disable no-param-reassign */
const { heartbeatInterval } = require("./config");
const state = require("./state");
const { WS_EVENTS } = require("./constants");
const { subscriber, publisher } = require("./pubSub");

const loginEvent = async (ws, loginData) => {
  const userId = loginData.userId;

  subscriber.subscribe(userId);
  state.websockets.set(userId, ws);

  const channels = loginData.channels;

  if (channels) {
    state.users.set(userId, new Map());

    channels.forEach(({ id: channelId, type: channelType }) => {
      state.users.get(userId).set(channelId, channelType);

      if (channelType === "friend") {
        publisher({
          type: WS_EVENTS.CHANNEL.SET_FRIEND_ONLINE,
          channelId,
          initiator: userId,
          payload: { channelId }
        });
      }
    });

    // state.users.get(userId).keys() are channelId's
    // values are the types of channels.
    for await (const cid of state.users.get(userId).keys()) {
      if (!state.channels.has(cid)) {
        state.channels.set(cid, new Set());
        subscriber.subscribe(cid);
      }

      state.channels.get(cid).add(userId);
    }
  }

  ws.isAlive = true;

  ws.send(
    JSON.stringify({
      type: WS_EVENTS.HELLO,
      payload: { heartbeatInterval: Number(heartbeatInterval) }
    })
  );
};

module.exports = loginEvent;
