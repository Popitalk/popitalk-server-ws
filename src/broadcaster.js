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
      const { channelId } = messagePayload;

      if (
        messageType === WS_EVENTS.USER.SUBSCRIBE_CHANNEL ||
        messageType === WS_EVENTS.USER.ADD_FRIEND ||
        messageType === WS_EVENTS.USER.ADD_CHANNEL
      ) {
        // If a user SUBSCRIBE_CHANNEL or ADD_FRIEND or ADD_CHANNEL
        // Get the users ID who initiated the event
        // set a channelId and channel type on their state
        state.users.get(userId).set(channelId, messagePayload.type);

        if (!state.channels.has(channelId)) {
          state.channels.set(channelId, new Set());
          subscriber.subscribe(channelId);
        }
        // Channel has a user ID added.
        console.log("adds user id, ", { userId });

        state.channels.get(channelId).add(userId);
      } else if (messageType === WS_EVENTS.USER.UNSUBSCRIBE_CHANNEL) {
        state.users.get(userId).delete(channelId);
        state.channels.get(channelId).delete(userId);

        if (state.channels.get(channelId).size === 0) {
          state.channels.delete(channelId);
          subscriber.unsubscribe(channelId);
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
      const { channelId } = messagePayload;

      if (state.channels.has(channelId)) {
        const userIds = state.channels.get(channelId).values();
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
          const userIds2 = state.channels.get(channelId).values();
          for await (const uid of userIds2) {
            state.users.get(uid).delete(channelId);
          }
          state.channels.delete(channelId);
          subscriber.unsubscribe(channelId);
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
