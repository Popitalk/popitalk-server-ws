/* eslint-disable prefer-const */
const { websocketsOfUsers, channelsState, usersState } = require("./state");
const { USER_EVENTS, CHANNEL_EVENTS, CHANNELS_EVENTS } = require("./constants");

const broadcaster = async ({
  messageType,
  messagePayload,
  messageInitiator,
  channelId,
  userId,
  publisher,
  subscriber
}) => {
  try {
    if (USER_EVENTS[messageType]) {
      const ws = websocketsOfUsers.get(userId);

      if (
        messageType === USER_EVENTS.WS_SUBSCRIBE_CHANNEL ||
        messageType === USER_EVENTS.WS_ADD_FRIEND ||
        messageType === USER_EVENTS.WS_ADD_CHANNEL
      ) {
        usersState.get(userId).set(channelId, messagePayload.type);
        if (!channelsState.has(channelId)) {
          channelsState.set(channelId, new Set());
          subscriber.subscribe(channelId);
        }
        channelsState.get(channelId).add(userId);
      } else if (messageType === USER_EVENTS.WS_UNSUBSCRIBE_CHANNEL) {
        usersState.get(userId).delete(channelId);
        channelsState.get(channelId).delete(userId);

        if (channelsState.get(channelId).size === 0) {
          channelsState.delete(channelId);
          subscriber.unsubscribe(channelId);
        }
      }

      if (
        !(
          messageType === USER_EVENTS.WS_SUBSCRIBE_CHANNEL ||
          messageType === USER_EVENTS.WS_UNSUBSCRIBE_CHANNEL
        )
      ) {
        ws.send(
          JSON.stringify({
            type: messageType,
            payload: messagePayload
          })
        );
      }
    } else if (CHANNEL_EVENTS[messageType]) {
      if (messageType === CHANNEL_EVENTS.WS_DELETE_FRIEND_ROOM) {
        if (channelsState.has(channelId)) {
          const userIds = channelsState.get(channelId).values();

          for await (const uid of userIds) {
            usersState.get(uid).delete(channelId);
          }
        }
        channelsState.delete(channelId);
        subscriber.unsubscribe(channelId);
      }

      if (channelsState.has(channelId)) {
        const userIds = channelsState.get(channelId).values();

        for await (const uid of userIds) {
          const ws = websocketsOfUsers.get(uid);

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

        if (messageType === CHANNEL_EVENTS.WS_DELETE_CHANNEL) {
          const userIds2 = channelsState.get(channelId).values();
          for await (const uid of userIds2) {
            usersState.get(uid).delete(channelId);
          }
          channelsState.delete(channelId);
          subscriber.unsubscribe(channelId);
        }
      }
    } else if (CHANNELS_EVENTS[messageType]) {
      if (usersState.has(userId)) {
        const channelIds = usersState.get(userId).keys();

        for await (const cid of channelIds) {
          if (channelsState.has(cid)) {
            const userIds = channelsState.get(cid).values();

            for await (const uid of userIds) {
              const ws = websocketsOfUsers.get(uid);

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
