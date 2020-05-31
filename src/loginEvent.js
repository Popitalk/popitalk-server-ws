/* eslint-disable no-param-reassign */
const { heartbeatInterval } = require("./config");
const { websocketsOfUsers, channelsState, usersState } = require("./state");
const { HELLO, WS_FRIEND_ONLINE } = require("./constants");
const { subscriber, publisher } = require("./pubSub");

const loginEvent = async (ws, loginData) => {
  const userId = loginData.id;

  subscriber.subscribe(userId);
  websocketsOfUsers.set(userId, ws);

  const channels = Object.entries(loginData.channels).map(ch => ({
    id: ch[0],
    type: ch[1].type
  }));

  if (channels) {
    usersState.set(userId, new Map());

    channels.forEach(({ id: channelId, type: channelType }) => {
      usersState.get(userId).set(channelId, channelType);
      if (channelType === "friend") {
        publisher({
          type: WS_FRIEND_ONLINE,
          channelId,
          initiator: userId,
          payload: { channelId }
        });
      }
    });

    for await (const cid of usersState.get(userId).keys()) {
      if (!channelsState.has(cid)) {
        channelsState.set(cid, new Set());
        subscriber.subscribe(cid);
      }

      channelsState.get(cid).add(userId);
    }
  }

  ws.isAlive = true;

  ws.send(
    JSON.stringify({
      type: HELLO,
      payload: { heartbeatInterval: Number(heartbeatInterval) }
    })
  );
};

module.exports = loginEvent;