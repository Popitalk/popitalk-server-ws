/* eslint-disable no-param-reassign */
const { channelsState, usersState } = require("./state");
const { subscriber, publisher } = require("./pubSub");
const { CHANNEL_EVENTS } = require("./constants");
// const redis = require("./redis");

const logoutEvent = async userId => {
  // entries error, why?
  for await (const cid of usersState.get(userId).entries()) {
    if (cid[1] === "friend") {
      publisher({
        type: CHANNEL_EVENTS.WS_FRIEND_OFFLINE,
        channelId: cid[0],
        initiator: userId,
        payload: { channelId: cid[0] }
      });
    }
  }

  for await (const cid of usersState.get(userId).keys()) {
    if (channelsState.has(cid)) {
      channelsState.get(cid).delete(userId);

      if (channelsState.get(cid).size === 0) {
        channelsState.delete(cid);
        subscriber.unsubscribe(cid);
      }
    }
  }

  subscriber.unsubscribe(userId);
  usersState.delete(userId);
  // websocketsOfUsers.delete(userId);

  // await pipeline.exec();
};

module.exports = logoutEvent;
