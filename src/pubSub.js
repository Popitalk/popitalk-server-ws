/* eslint-disable prefer-const */
const Redis = require("ioredis");
const config = require("./config");

const {
  userEvents,
  userChannelEvents,
  channelsEvents,
  channelEvents,
  WS_JOIN_CHANNEL,
  WS_LEAVE_CHANNEL,
  WS_ADD_MEMBER,
  WS_ADD_CHANNEL,
  WS_DELETE_FRIEND,
  WS_DELETE_MEMBER,
  WS_SUBSCRIBE_CHANNEL,
  WS_UNSUBSCRIBE_CHANNEL,
  WS_BLOCK_FRIEND,
  WS_UNFRIEND,
  WS_ADD_BLOCKER,
  WS_DELETE_FRIEND_ROOM
} = require("./constants");
const broadcaster = require("./broadcaster");

const pub = new Redis({
  host: config.redisHost || "localhost",
  port: config.redisPort || 6379,
  db: config.redisIndex || 0,
  password: config.redisPassword || null
});

const subscriber = new Redis({
  host: config.redisHost || "localhost",
  port: config.redisPort || 6379,
  db: config.redisIndex || 0,
  password: config.redisPassword || null
});

let publisher;

subscriber.on("message", async (channel, message) => {
  const parsedMessage = JSON.parse(message);
  const messageType = parsedMessage.type;
  const messagePayload = parsedMessage.payload;
  let { userId } = parsedMessage;
  let { channelId } = parsedMessage;
  const messageInitiator = parsedMessage.initiator;

  broadcaster({
    messageType,
    messagePayload,
    messageInitiator,
    channelId,
    userId,
    publisher,
    subscriber
  });
});

publisher = async ({ type, initiator, channelId, userId, payload }) => {
  if (userEvents.includes(type)) {
    pub.publish(
      userId,
      JSON.stringify({
        userId,
        channelId,
        type,
        payload
      })
    );
  } else if (channelEvents.includes(type)) {
    pub.publish(
      channelId,
      JSON.stringify({
        channelId,
        type,
        payload,
        initiator
      })
    );
  }
  if (userChannelEvents.includes(type)) {
    if (type === WS_JOIN_CHANNEL) {
      pub.publish(
        userId,
        JSON.stringify({
          type: WS_SUBSCRIBE_CHANNEL,
          userId,
          payload
        })
      );
      pub.publish(
        channelId,
        JSON.stringify({
          type: WS_ADD_MEMBER,
          channelId,
          payload,
          initiator
        })
      );
    } else if (type === WS_LEAVE_CHANNEL) {
      if (!payload.public) {
        pub.publish(
          userId,
          JSON.stringify({
            type: WS_UNSUBSCRIBE_CHANNEL,
            userId,
            payload
          })
        );
      }
      pub.publish(
        channelId,
        JSON.stringify({
          type: WS_DELETE_MEMBER,
          channelId,
          payload,
          initiator
        })
      );
    } else if (type === WS_UNFRIEND) {
      pub.publish(
        channelId,
        JSON.stringify({
          type: WS_DELETE_FRIEND_ROOM,
          channelId,
          payload
        })
      );
      pub.publish(
        userId,
        JSON.stringify({
          type: WS_DELETE_FRIEND,
          userId,
          payload
        })
      );
    } else if (type === WS_BLOCK_FRIEND) {
      pub.publish(
        channelId,
        JSON.stringify({
          type: WS_DELETE_FRIEND_ROOM,
          channelId,
          payload
        })
      );
      pub.publish(
        userId,
        JSON.stringify({
          type: WS_ADD_BLOCKER,
          userId,
          payload
        })
      );
    }
  } else if (channelsEvents.includes(type)) {
    console.log("channelsEvents");
  }
};

module.exports = { pub, publisher, subscriber };
