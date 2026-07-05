const { createServer } = require("./index");
const { loadEnv } = require("./loadEnv");

const DEFAULT_LOCAL_PORT = 5173;

function createLocalDevServer(options = {}) {
  return createServer({
    ...options,
    dataBackend: "json",
    authEnforcement: null,
    allowProtectedPagesWithoutSession: true,
  });
}

function startLocalDevServer({
  port = Number(process.env.PORT || DEFAULT_LOCAL_PORT),
} = {}) {
  loadEnv();
  process.env.ALLOW_LOCAL_DEV_LOGIN = process.env.ALLOW_LOCAL_DEV_LOGIN || "true";
  const server = createLocalDevServer();

  server.listen(port, () => {
    console.log(`Local dev server listening at http://localhost:${port}`);
    console.log("Data backend: json");
    console.log("Auth enforcement: local-dev");
  });

  return server;
}

if (require.main === module) {
  startLocalDevServer();
}

module.exports = {
  createLocalDevServer,
  startLocalDevServer,
};
