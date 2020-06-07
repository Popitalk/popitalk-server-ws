/* eslint-disable prefer-const */
const Redis = require("ioredis");
const config = require("./config");
const { WS_EVENTS } = require("./constants");
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
  if (WS_EVENTS.USER[type]) {
    pub.publish(
      userId,
      JSON.stringify({
        userId,
        channelId,
        type,
        payload
      })
    );
  } else if (WS_EVENTS.CHANNEL[type]) {
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
  if (WS_EVENTS.USER_CHANNEL[type]) {
    if (type === WS_EVENTS.USER_CHANNEL.JOIN_CHANNEL) {
      pub.publish(
        userId,
        JSON.stringify({
          type: WS_EVENTS.USER.SUBSCRIBE_CHANNEL,
          userId,
          payload
        })
      );
      pub.publish(
        channelId,
        JSON.stringify({
          type: WS_EVENTS.CHANNEL.ADD_MEMBER,
          channelId,
          payload,
          initiator
        })
      );
    } else if (type === WS_EVENTS.USER_CHANNEL.LEAVE_CHANNEL) {
      if (!payload.public) {
        pub.publish(
          userId,
          JSON.stringify({
            type: WS_EVENTS.USER.UNSUBSCRIBE_CHANNEL,
            userId,
            payload
          })
        );
      }
      pub.publish(
        channelId,
        JSON.stringify({
          type: WS_EVENTS.CHANNEL.DELETE_MEMBER,
          channelId,
          payload,
          initiator
        })
      );
    }
    // else if (type === WS_EVENTS.USER_CHANNEL.BEFRIEND) {
    //   pub.publish(
    //     userId,
    //     JSON.stringify({
    //       type: WS_EVENTS.USER.SUBSCRIBE_CHANNEL,
    //       userId,
    //       payload
    //     })
    //   );
    //   pub.publish(
    //     channelId,
    //     JSON.stringify({
    //       type: WS_EVENTS.CHANNEL,
    //       channelId,
    //       payload
    //     })
    //   );
    // }
    else if (type === WS_EVENTS.USER_CHANNEL.UNFRIEND) {
      pub.publish(
        channelId,
        JSON.stringify({
          type: WS_EVENTS.CHANNEL.DELETE_CHANNEL,
          channelId,
          payload
        })
      );
      pub.publish(
        userId,
        JSON.stringify({
          type: WS_EVENTS.USER.DELETE_FRIEND,
          userId,
          payload
        })
      );
    } else if (type === WS_EVENTS.USER_CHANNEL.BLOCK_FRIEND) {
      pub.publish(
        channelId,
        JSON.stringify({
          type: WS_EVENTS.CHANNEL.DELETE_CHANNEL,
          channelId,
          payload
        })
      );
      pub.publish(
        userId,
        JSON.stringify({
          type: WS_EVENTS.USER.ADD_BLOCKER,
          userId,
          payload
        })
      );
    }
  } else if (WS_EVENTS.USERS_CHANNELS[type]) {
    console.log("WS_EVENTS.USERS_CHANNELS");
  }
};

module.exports = { pub, publisher, subscriber };
