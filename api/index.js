const { createServer } = require("../server/index");
const server = createServer();

module.exports = (req, res) => {
  server.emit("request", req, res);
};
