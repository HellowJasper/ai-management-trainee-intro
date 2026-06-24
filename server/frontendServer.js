const http = require("node:http");
const path = require("node:path");
const { serveStatic } = require("./index");

const DEFAULT_PUBLIC_ROOT = path.join(__dirname, "..");
const DEFAULT_PORT = 5174;
const DEFAULT_API_BASE_URL = "http://localhost:63779";

function sendRuntimeConfig(response, apiBaseUrl) {
  const normalizedApiBaseUrl = String(apiBaseUrl || "").trim().replace(/\/+$/, "");
  const body = [
    "window.JoincareRuntimeConfig = window.JoincareRuntimeConfig || {};",
    `window.JoincareRuntimeConfig.apiBaseUrl = ${JSON.stringify(normalizedApiBaseUrl)};`,
    "window.JOINCARE_API_BASE_URL = window.JoincareRuntimeConfig.apiBaseUrl;",
    "",
  ].join("\n");

  response.writeHead(200, {
    "Content-Type": "text/javascript; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(body);
}

function createFrontendServer({
  publicRoot = DEFAULT_PUBLIC_ROOT,
  apiBaseUrl = process.env.API_BASE_URL || DEFAULT_API_BASE_URL,
} = {}) {
  const resolvedPublicRoot = path.resolve(publicRoot);

  return http.createServer((request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    if (url.pathname === "/runtime-config.js") {
      sendRuntimeConfig(response, apiBaseUrl);
      return;
    }

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      response.writeHead(404, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(JSON.stringify({
        error: {
          message: "API is served by the separated backend service.",
          statusCode: 404,
        },
      }));
      return;
    }

    serveStatic(request, response, url, resolvedPublicRoot);
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || DEFAULT_PORT);
  const server = createFrontendServer();

  server.listen(port, () => {
    console.log(`Frontend listening at http://localhost:${port}`);
    console.log(`API base URL: ${process.env.API_BASE_URL || DEFAULT_API_BASE_URL}`);
  });
}

module.exports = {
  createFrontendServer,
};
