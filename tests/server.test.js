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

test("API lists team formation tracks for backend-controlled grouping", async (t) => {
  const publicRoot = path.join(__dirname, "..");
  const teamRepository = {
    async listTeams() {
      return [
        {
          id: "pharma",
          index: "01",
          name: "药学",
          advisor: { name: "赛道顾问 A", role: "赛道顾问" },
          members: [
            { name: "队友 01" },
            { name: "队友 02" },
            { name: "队友 03" },
            { name: "队友 04" },
          ],
        },
        {
          id: "medicine",
          index: "02",
          name: "医学",
          advisor: { name: "赛道顾问 B", role: "赛道顾问" },
          members: [
            { name: "队友 01" },
            { name: "队友 02" },
            { name: "队友 03" },
            { name: "队友 04" },
          ],
        },
        {
          id: "marketing",
          index: "03",
          name: "营销",
          advisor: { name: "赛道顾问 C", role: "赛道顾问" },
          members: [
            { name: "队友 01" },
            { name: "队友 02" },
            { name: "队友 03" },
            { name: "队友 04" },
          ],
        },
        {
          id: "functions",
          index: "04",
          name: "职能",
          advisor: { name: "赛道顾问 D", role: "赛道顾问" },
          members: [
            { name: "队友 01" },
            { name: "队友 02" },
            { name: "队友 03" },
            { name: "队友 04" },
          ],
        },
        {
          id: "production",
          index: "05",
          name: "生产",
          advisor: { name: "赛道顾问 E", role: "赛道顾问" },
          members: [
            { name: "队友 01" },
            { name: "队友 02" },
            { name: "队友 03" },
            { name: "队友 04" },
          ],
        },
      ];
    },
  };
  const server = createServer({ publicRoot, teamRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${baseUrl}/api/teams`);
  const teams = await response.json();

  assert.equal(response.status, 200);
  assert.equal(teams.length, 5);
  assert.deepEqual(
    teams.map((team) => team.name),
    ["药学", "医学", "营销", "职能", "生产"],
  );
  teams.forEach((team) => {
    assert.equal(team.advisor.role, "赛道顾问");
    assert.equal(team.members.length, 4);
  });
});

test("API exposes mission countdown state and starts it on demand", async (t) => {
  const publicRoot = path.join(__dirname, "..");
  const missionCountdownRepository = {
    startedAt: null,
    async getState() {
      return {
        startedAt: this.startedAt,
        durationMs: 24 * 60 * 60 * 1000,
        serverNow: "2026-06-18T10:00:00.000Z",
      };
    },
    async startCountdown(payload = {}) {
      if (!this.startedAt) {
        this.startedAt = payload.startedAt || "2026-06-18T10:00:00.000Z";
      }

      return this.getState();
    },
  };
  const server = createServer({ publicRoot, missionCountdownRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const initialResponse = await fetch(`${baseUrl}/api/mission-countdown`);
  const initialState = await initialResponse.json();

  assert.equal(initialResponse.status, 200);
  assert.equal(initialState.startedAt, null);
  assert.equal(initialState.durationMs, 86400000);

  const startResponse = await fetch(`${baseUrl}/api/mission-countdown/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startedAt: "2026-06-18T10:30:00.000Z",
    }),
  });
  const startedState = await startResponse.json();

  assert.equal(startResponse.status, 200);
  assert.equal(startedState.startedAt, "2026-06-18T10:30:00.000Z");
  assert.equal(startedState.durationMs, 86400000);

  const nextResponse = await fetch(`${baseUrl}/api/mission-countdown`);
  const nextState = await nextResponse.json();

  assert.equal(nextResponse.status, 200);
  assert.equal(nextState.startedAt, "2026-06-18T10:30:00.000Z");
});

test("API exposes current roadshow team state and starts its timer", async (t) => {
  const publicRoot = path.join(__dirname, "..");
  const roadshowRepository = {
    startedAt: null,
    async getState() {
      return {
        currentTeamId: "marketing",
        currentTeam: {
          id: "marketing",
          name: "营销",
          project: "智能客户洞察平台",
        },
        nextTeamId: "functions",
        nextTeam: {
          id: "functions",
          name: "职能",
          project: "职能流程自动化助手",
        },
        phase: "DEMO",
        startedAt: this.startedAt,
        durationMs: 15 * 60 * 1000,
        serverNow: "2026-06-18T14:00:00.000Z",
      };
    },
    async startRoadshow(payload = {}) {
      if (!this.startedAt) {
        this.startedAt = payload.startedAt || "2026-06-18T14:00:00.000Z";
      }

      return this.getState();
    },
  };
  const server = createServer({ publicRoot, roadshowRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const initialResponse = await fetch(`${baseUrl}/api/roadshow`);
  const initialState = await initialResponse.json();

  assert.equal(initialResponse.status, 200);
  assert.equal(initialState.currentTeamId, "marketing");
  assert.equal(initialState.currentTeam.name, "营销");
  assert.equal(initialState.nextTeamId, "functions");
  assert.equal(initialState.nextTeam.name, "职能");
  assert.equal(initialState.startedAt, null);
  assert.equal(initialState.durationMs, 900000);

  const startResponse = await fetch(`${baseUrl}/api/roadshow/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startedAt: "2026-06-18T14:02:00.000Z",
    }),
  });
  const startedState = await startResponse.json();

  assert.equal(startResponse.status, 200);
  assert.equal(startedState.currentTeamId, "marketing");
  assert.equal(startedState.startedAt, "2026-06-18T14:02:00.000Z");

  const nextResponse = await fetch(`${baseUrl}/api/roadshow`);
  const nextState = await nextResponse.json();

  assert.equal(nextResponse.status, 200);
  assert.equal(nextState.startedAt, "2026-06-18T14:02:00.000Z");
});

test("API lists vote results with the confirmed ranking point scale", async (t) => {
  const publicRoot = path.join(__dirname, "..");
  const voteResultsRepository = {
    async listVoteResults() {
      return {
        pointScale: [100, 85, 70, 55, 40],
        results: [
          { id: "pharma", name: "药学", votes: 148 },
          { id: "medicine", name: "医学", votes: 121 },
          { id: "marketing", name: "营销", votes: 180 },
          { id: "functions", name: "职能", votes: 67 },
          { id: "production", name: "生产", votes: 92 },
        ],
      };
    },
  };
  const server = createServer({ publicRoot, voteResultsRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${baseUrl}/api/vote-results`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(payload.pointScale, [100, 85, 70, 55, 40]);
  assert.equal(payload.results.length, 5);
  assert.deepEqual(
    payload.results.map((team) => team.id),
    ["pharma", "medicine", "marketing", "functions", "production"],
  );
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
