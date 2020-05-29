const glue = require("@hapi/glue");
const config = require("./config");
const manifest = require("./manifest");

const startServer = async () => {
  try {
    const server = await glue.compose(manifest, { relativeTo: __dirname });
    await server.start();

    server.log(
      ["serv"],
      `Server is running on ${server.info.uri} in ${config.mode} mode`
    );

    // [
    //   "SIGINT",
    //   "SIGTERM",
    //   "SIGQUIT",
    //   // "SIGKILL",
    //   "uncaughtException",
    //   "unhandledRejection"
    // ].forEach(signal => {
    //   process.on(signal, async () => {
    //     server.log(["serv"], "Server stopped");
    //     await server.stop({ timeout: 60000 });
    //     // await closeAllConnections();
    //     process.exit(1);
    //   });
    // });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  }
};

startServer();
