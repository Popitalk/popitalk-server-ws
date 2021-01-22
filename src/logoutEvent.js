/* eslint-disable no-param-reassign */
const state = require("./state");
const { WS_EVENTS } = require("./constants");
const { subscriber, publisher } = require("./pubSub");
const redis = require("./redis");

const logoutEvent = async userId => {
  // entries error, why?
  for await (const cid of state.users.get(userId).keys()) {
    await redis.srem(`viewers:${cid}`, userId);

    publisher({
      type: WS_EVENTS.CHANNEL.SET_FRIEND_OFFLINE,
      channelId: cid,
      initiator: userId,
      payload: { channelId: cid }
    });

    publisher({
      type: WS_EVENTS.CHANNEL.DELETE_VIEWER,
      channelId: cid,
      initiator: userId,
      payload: { channelId: cid, userId }
    });

    if (state.channels.has(cid)) {
      state.channels.get(cid).delete(userId);

      if (state.channels.get(cid).size === 0) {
        state.channels.delete(cid);
        subscriber.unsubscribe(cid);
      }
    }
  }

  subscriber.unsubscribe(userId);
  state.users.delete(userId);

  // state.websockets.delete(userId);
  // await pipeline.exec();
};

module.exports = logoutEvent;
