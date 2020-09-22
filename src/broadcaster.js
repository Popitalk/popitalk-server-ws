/* eslint-disable prefer-const */
const state = require("./state");
const { WS_EVENTS } = require("./constants");

const broadcaster = async ({
  messageType,
  messagePayload,
  messageInitiator,
  userId,
  publisher,
  subscriber
}) => {
  try {
    if (WS_EVENTS.USER[messageType]) {
      const ws = state.websockets.get(userId);

      if (
        messageType === WS_EVENTS.USER.SUBSCRIBE_CHANNEL ||
        messageType === WS_EVENTS.USER.ADD_FRIEND ||
        messageType === WS_EVENTS.USER.ADD_CHANNEL
      ) {
        // If a user SUBSCRIBE_CHANNEL or ADD_FRIEND or ADD_CHANNEL
        // Get the users ID who initiated the event
        // set a channelId and channel type on their state
        state.users
          .get(userId)
          .set(messagePayload.channelId, messagePayload.type);

        if (!state.channels.has(messagePayload.channelId)) {
          state.channels.set(messagePayload.channelId, new Set());
          subscriber.subscribe(messagePayload.channelId);
        }
        // Channel has a user ID added.
        console.log("adds user id, ", { userId });
        state.channels.get(messagePayload.channelId).add(userId);
      } else if (messageType === WS_EVENTS.USER.UNSUBSCRIBE_CHANNEL) {
        state.users.get(userId).delete(messagePayload.channelId);
        state.channels.get(messagePayload.channelId).delete(userId);

        if (state.channels.get(messagePayload.channelId).size === 0) {
          state.channels.delete(messagePayload.channelId);
          subscriber.unsubscribe(messagePayload.channelId);
        }
      }

      if (
        !(
          messageType === WS_EVENTS.USER.SUBSCRIBE_CHANNEL ||
          messageType === WS_EVENTS.USER.UNSUBSCRIBE_CHANNEL
        )
      ) {
        ws.send(
          JSON.stringify({
            type: messageType,
            payload: messagePayload
          })
        );
      }
    } else if (
      WS_EVENTS.CHANNEL[messageType] ||
      WS_EVENTS.VIDEO_CONTROL[messageType]
    ) {
      // if (messageType === CHANNEL_EVENTS.WS_DELETE_FRIEND_ROOM) {
      //   if (state.channels.has(channelId)) {
      //     const userIds = state.channels.get(channelId).values();

      //     for await (const uid of userIds) {
      //       state.users.get(uid).delete(channelId);
      //     }
      //   }
      //   state.channels.delete(channelId);
      //   subscriber.unsubscribe(channelId);
      // }
      if (state.channels.has(messagePayload.channelId)) {
        const userIds = state.channels.get(messagePayload.channelId).values();
        console.log("add member event, ", { userIds });

        for await (const uid of userIds) {
          const ws = state.websockets.get(uid);

          // if(ws.readyState === 1)
          if (uid !== messageInitiator) {
            ws.send(
              JSON.stringify({
                type: messageType,
                payload: messagePayload
              })
            );
          }
        }

        if (messageType === WS_EVENTS.CHANNEL.DELETE_CHANNEL) {
          const userIds2 = state.channels
            .get(messagePayload.channelId)
            .values();
          for await (const uid of userIds2) {
            state.users.get(uid).delete(messagePayload.channelId);
          }
          state.channels.delete(messagePayload.channelId);
          subscriber.unsubscribe(messagePayload.channelId);
        }
      }
    } else if (WS_EVENTS.USERS_CHANNELS[messageType]) {
      if (state.users.has(userId)) {
        const channelIds = state.users.get(userId).keys();

        for await (const cid of channelIds) {
          if (state.channels.has(cid)) {
            const userIds = state.channels.get(cid).values();

            for await (const uid of userIds) {
              const ws = state.websockets.get(uid);

              ws.send(
                JSON.stringify({
                  type: messageType,
                  payload: messagePayload
                })
              );
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
};

module.exports = broadcaster;
