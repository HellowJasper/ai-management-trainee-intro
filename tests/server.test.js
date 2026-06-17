const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createServer } = require("../server");
const { createAdminStateRepository } = require("../server/adminStateRepository");
const { createTraineeRepository } = require("../server/traineeRepository");

async function createTempRepository(initialTrainees) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-intro-"));
  const dataPath = path.join(tempDir, "trainees.json");
  await fs.writeFile(dataPath, `${JSON.stringify(initialTrainees, null, 2)}\n`);

  return {
    dataPath,
    publicRoot: tempDir,
    repository: createTraineeRepository(dataPath),
  };
}

async function createTempAdminStateRepository(initialState) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-admin-state-"));
  const dataPath = path.join(tempDir, "admin-state.json");

  if (initialState) {
    await fs.writeFile(dataPath, `${JSON.stringify(initialState, null, 2)}\n`);
  }

  return {
    dataPath,
    publicRoot: tempDir,
    adminStateRepository: createAdminStateRepository(dataPath),
  };
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve(`http://127.0.0.1:${server.address().port}`);
    });
  });
}

test("API lists trainees and persists host sentence updates", async (t) => {
  const { dataPath, publicRoot, repository } = await createTempRepository([
    {
      id: "jasper",
      name: "Jasper",
      sentence: "",
    },
  ]);
  const server = createServer({ publicRoot, repository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const listResponse = await fetch(`${baseUrl}/api/trainees`);
  const trainees = await listResponse.json();

  assert.equal(listResponse.status, 200);
  assert.equal(trainees.length, 1);
  assert.equal(trainees[0].id, "jasper");

  const saveResponse = await fetch(`${baseUrl}/api/trainees/jasper/sentence`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sentence: "我把咖啡变成自动化工作流的启动按钮。",
    }),
  });
  const savedTrainee = await saveResponse.json();

  assert.equal(saveResponse.status, 200);
  assert.equal(savedTrainee.sentence, "我把咖啡变成自动化工作流的启动按钮。");

  const storedTrainees = JSON.parse(await fs.readFile(dataPath, "utf8"));
  assert.equal(storedTrainees[0].sentence, "我把咖啡变成自动化工作流的启动按钮。");
});

test("API returns 404 for missing trainees", async (t) => {
  const { publicRoot, repository } = await createTempRepository([]);
  const server = createServer({ publicRoot, repository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${baseUrl}/api/trainees/missing`);
  const payload = await response.json();

  assert.equal(response.status, 404);
  assert.equal(payload.error.statusCode, 404);
});

test("/admin serves the management console shell", async (t) => {
  const publicRoot = path.join(__dirname, "..");
  const server = createServer({ publicRoot });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${baseUrl}/admin`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.match(html, /AI 星锐黑客松 管理后台/);
  assert.match(html, /id="stageRows"/);
  assert.match(html, /src="\.\/src\/admin\.js\?v=20260617-01"/);

  const slashResponse = await fetch(`${baseUrl}/admin/`);
  const slashHtml = await slashResponse.text();

  assert.equal(slashResponse.status, 200);
  assert.match(slashHtml, /大屏预览/);
});

test("API root returns a JSON 404 instead of falling through to static files", async (t) => {
  const publicRoot = path.join(__dirname, "..");
  const server = createServer({ publicRoot });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${baseUrl}/api`);
  const payload = await response.json();

  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.equal(payload.error.statusCode, 404);
  assert.match(payload.error.message, /API route was not found/);

  const healthResponse = await fetch(`${baseUrl}/api/health`);
  assert.equal(healthResponse.status, 200);
});

test("static directories without index files return 404 without closing the server", async (t) => {
  const publicRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ai-static-"));
  await fs.mkdir(path.join(publicRoot, "empty"));
  const server = createServer({ publicRoot });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${baseUrl}/empty`);
  const text = await response.text();

  assert.equal(response.status, 404);
  assert.equal(text, "Not Found");

  const healthResponse = await fetch(`${baseUrl}/api/health`);
  assert.equal(healthResponse.status, 200);
});

test("admin state API returns current stage state", async (t) => {
  const { publicRoot, adminStateRepository } = await createTempAdminStateRepository({
    currentStageId: "team",
    updatedAt: "2026-05-22T06:00:00.000Z",
    stages: [
      { id: "team", name: "组队开启" },
      { id: "vote", name: "投票开启" },
    ],
    logs: [{ at: "2026-05-22T06:00:00.000Z", actor: "admin", message: "开启阶段【组队开启】" }],
  });
  const server = createServer({ publicRoot, adminStateRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${baseUrl}/api/admin/state`);
  const state = await response.json();

  assert.equal(response.status, 200);
  assert.equal(state.currentStageId, "team");
  assert.equal(state.updatedAt, "2026-05-22T06:00:00.000Z");
  assert.deepEqual(
    state.stages.map((stage) => stage.id),
    ["team", "vote"],
  );
  assert.equal(state.logs.length, 1);
});

test("admin stage API updates current stage and persists a log", async (t) => {
  const { dataPath, publicRoot, adminStateRepository } = await createTempAdminStateRepository({
    currentStageId: "team",
    updatedAt: "2026-05-22T06:00:00.000Z",
    stages: [
      { id: "team", name: "组队开启" },
      { id: "vote", name: "投票开启" },
    ],
    logs: [],
  });
  const server = createServer({ publicRoot, adminStateRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${baseUrl}/api/admin/stage`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ stageId: "vote" }),
  });
  const state = await response.json();

  assert.equal(response.status, 200);
  assert.equal(state.currentStageId, "vote");
  assert.match(state.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(state.logs.length, 1);
  assert.equal(state.logs[0].stageId, "vote");
  assert.match(state.logs[0].message, /投票开启/);

  const storedState = JSON.parse(await fs.readFile(dataPath, "utf8"));
  assert.equal(storedState.currentStageId, "vote");
  assert.equal(storedState.logs[0].stageId, "vote");
});

test("admin stage API rejects unknown stage ids", async (t) => {
  const { publicRoot, adminStateRepository } = await createTempAdminStateRepository({
    currentStageId: "team",
    updatedAt: "2026-05-22T06:00:00.000Z",
    stages: [
      { id: "team", name: "组队开启" },
      { id: "vote", name: "投票开启" },
    ],
    logs: [],
  });
  const server = createServer({ publicRoot, adminStateRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${baseUrl}/api/admin/stage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ stageId: "missing" }),
  });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.error.statusCode, 400);
  assert.match(payload.error.message, /Unknown admin stage id/);
});
