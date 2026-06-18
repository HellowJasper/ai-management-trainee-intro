const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { createAdminStateRepository } = require("./adminStateRepository");
const { createMissionCountdownRepository } = require("./missionCountdownRepository");
const { createRoadshowRepository } = require("./roadshowRepository");
const { createTeamRepository } = require("./teamRepository");
const { createTraineeRepository } = require("./traineeRepository");
const { createVoteResultsRepository } = require("./voteResultsRepository");

const DEFAULT_PUBLIC_ROOT = path.join(__dirname, "..");
const DEFAULT_PORT = 5173;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendError(response, error) {
  const statusCode = error.statusCode || 500;
  sendJson(response, statusCode, {
    error: {
      message: error.message || "Internal server error.",
      statusCode,
    },
  });
}

function readJsonBody(request, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw) > maxBytes) {
        const error = new Error("Request body is too large.");
        error.statusCode = 413;
        reject(error);
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        error.statusCode = 400;
        error.message = "Request body must be valid JSON.";
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function decodePathname(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    const error = new Error("Invalid URL path.");
    error.statusCode = 400;
    throw error;
  }
}

async function routeApi(
  request,
  response,
  url,
  repository,
  adminStateRepository,
  teamRepository,
  missionCountdownRepository,
  roadshowRepository,
  voteResultsRepository,
) {
  const segments = url.pathname.split("/").filter(Boolean);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    response.end();
    return true;
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    sendJson(response, 200, { status: "ok" });
    return true;
  }

  if (url.pathname === "/api/admin/state" && request.method === "GET") {
    sendJson(response, 200, await adminStateRepository.getState());
    return true;
  }

  if (url.pathname === "/api/admin/stage" && ["POST", "PATCH"].includes(request.method)) {
    const payload = await readJsonBody(request);
    sendJson(response, 200, await adminStateRepository.setCurrentStage(payload.stageId));
    return true;
  }

  if (url.pathname === "/api/teams" && request.method === "GET") {
    sendJson(response, 200, await teamRepository.listTeams());
    return true;
  }

  if (url.pathname === "/api/mission-countdown" && request.method === "GET") {
    sendJson(response, 200, await missionCountdownRepository.getState());
    return true;
  }

  if (url.pathname === "/api/mission-countdown/start" && request.method === "POST") {
    const payload = await readJsonBody(request);
    sendJson(response, 200, await missionCountdownRepository.startCountdown(payload));
    return true;
  }

  if (url.pathname === "/api/roadshow" && request.method === "GET") {
    sendJson(response, 200, await roadshowRepository.getState());
    return true;
  }

  if (url.pathname === "/api/roadshow/start" && request.method === "POST") {
    const payload = await readJsonBody(request);
    sendJson(response, 200, await roadshowRepository.startRoadshow(payload));
    return true;
  }

  if (url.pathname === "/api/vote-results" && request.method === "GET") {
    sendJson(response, 200, await voteResultsRepository.listVoteResults());
    return true;
  }

  if (segments[0] !== "api" || segments[1] !== "trainees") {
    return false;
  }

  if (segments.length === 2 && request.method === "GET") {
    sendJson(response, 200, await repository.listTrainees());
    return true;
  }

  if (segments.length === 2 && request.method === "POST") {
    const payload = await readJsonBody(request);
    sendJson(response, 201, await repository.createTrainee(payload));
    return true;
  }

  const id = segments[2];
  if (!id) {
    return false;
  }

  if (segments.length === 3 && request.method === "GET") {
    sendJson(response, 200, await repository.getTrainee(id));
    return true;
  }

  if (segments.length === 3 && request.method === "PATCH") {
    const payload = await readJsonBody(request);
    sendJson(response, 200, await repository.updateTrainee(id, payload));
    return true;
  }

  if (segments.length === 3 && request.method === "DELETE") {
    sendJson(response, 200, await repository.deleteTrainee(id));
    return true;
  }

  if (segments.length === 4 && segments[3] === "sentence" && ["POST", "PATCH"].includes(request.method)) {
    const payload = await readJsonBody(request);
    sendJson(response, 200, await repository.saveSentence(id, payload.sentence));
    return true;
  }

  return false;
}

function serveStatic(request, response, url, publicRoot) {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Method Not Allowed");
    return;
  }

  const decodedPathname = decodePathname(url.pathname);
  const requestPath =
    decodedPathname === "/"
      ? "/index.html"
      : decodedPathname === "/admin" || decodedPathname === "/admin/"
        ? "/admin.html"
        : decodedPathname;
  const filePath = path.resolve(publicRoot, `.${requestPath}`);

  if (!filePath.startsWith(`${publicRoot}${path.sep}`) && filePath !== publicRoot) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not Found");
      return;
    }

    const resolvedFilePath = stats.isDirectory() ? path.join(filePath, "index.html") : filePath;

    fs.stat(resolvedFilePath, (resolvedStatError, resolvedStats) => {
      if (resolvedStatError || !resolvedStats.isFile()) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not Found");
        return;
      }

      const extension = path.extname(resolvedFilePath).toLowerCase();

      response.writeHead(200, {
        "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      });

      if (request.method === "HEAD") {
        response.end();
        return;
      }

      const stream = fs.createReadStream(resolvedFilePath);
      stream.on("error", () => {
        if (!response.headersSent) {
          response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("Internal Server Error");
          return;
        }

        response.destroy();
      });
      stream.pipe(response);
    });
  });
}

function createServer({
  publicRoot = DEFAULT_PUBLIC_ROOT,
  repository = createTraineeRepository(),
  adminStateRepository = createAdminStateRepository(),
  teamRepository = createTeamRepository(),
  missionCountdownRepository = createMissionCountdownRepository(),
  roadshowRepository = createRoadshowRepository(),
  voteResultsRepository = createVoteResultsRepository(),
} = {}) {
  const resolvedPublicRoot = path.resolve(publicRoot);

  return http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    try {
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
        const handled = await routeApi(
          request,
          response,
          url,
          repository,
          adminStateRepository,
          teamRepository,
          missionCountdownRepository,
          roadshowRepository,
          voteResultsRepository,
        );
        if (!handled) {
          sendJson(response, 404, {
            error: {
              message: "API route was not found.",
              statusCode: 404,
            },
          });
        }
        return;
      }

      serveStatic(request, response, url, resolvedPublicRoot);
    } catch (error) {
      sendError(response, error);
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || DEFAULT_PORT);
  const server = createServer();

  server.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

module.exports = {
  createServer,
  routeApi,
};
