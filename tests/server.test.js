const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createServer } = require("../server");
const { createFrontendServer } = require("../server/frontendServer");
const { createAdminStateRepository } = require("../server/adminStateRepository");
const { createAuditLogRepository } = require("../server/auditLogRepository");
const { createAuthSessionRepository } = require("../server/authSessionRepository");
const { createJudgeScoresRepository } = require("../server/judgeScoresRepository");
const { createResultSnapshotRepository } = require("../server/resultSnapshotRepository");
const { createTeamRepository } = require("../server/teamRepository");
const { createTraineeRepository } = require("../server/traineeRepository");
const { createUserRoleRepository } = require("../server/userRoleRepository");
const { createVoteResultsRepository } = require("../server/voteResultsRepository");
const { createWorksRepository } = require("../server/worksRepository");

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
  const auditLogPath = path.join(tempDir, "audit-logs.json");

  if (initialState) {
    await fs.writeFile(dataPath, `${JSON.stringify(initialState, null, 2)}\n`);
  }
  await fs.writeFile(auditLogPath, `${JSON.stringify({ logs: [] }, null, 2)}\n`);

  return {
    dataPath,
    publicRoot: tempDir,
    adminStateRepository: createAdminStateRepository(dataPath),
    auditLogRepository: createAuditLogRepository(auditLogPath),
  };
}

async function createTempJsonFile(prefix, filename, initialData) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const dataPath = path.join(tempDir, filename);
  await fs.writeFile(dataPath, `${JSON.stringify(initialData, null, 2)}\n`);

  return {
    dataPath,
    publicRoot: tempDir,
  };
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve(`http://127.0.0.1:${server.address().port}`);
    });
  });
}

async function loginAs(baseUrl, role, overrides = {}) {
  const response = await fetch(`${baseUrl}/api/auth/feishu/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role,
      userId: `${role}-001`,
      name: `${role} 用户`,
      department: "测试部门",
      ...overrides,
    }),
  });

  return response.headers.get("set-cookie").split(";")[0];
}

function createSiteBootstrapTestRepositories(overrides = {}) {
  return {
    repository: {
      async listTrainees() {
        return [
          {
            id: "jasper",
            name: "Jasper",
            title: "AI 产品管培生",
          },
        ];
      },
    },
    teamRepository: {
      async listTeams() {
        return [
          {
            id: "marketing",
            index: "03",
            name: "营销",
            advisor: { name: "赛道顾问 C", role: "赛道顾问" },
            members: [{ userId: "player-001", name: "测试选手" }],
          },
        ];
      },
    },
    voteResultsRepository: {
      async listVoteResults() {
        return {
          status: "voting",
          windowLabel: "决赛投票",
          pointScale: [100, 85, 70, 55, 40],
          results: [{ id: "marketing", name: "营销", votes: 9 }],
          voters: {},
        };
      },
    },
    judgeScoresRepository: {
      async readState() {
        return { scores: {} };
      },
    },
    worksRepository: {
      async listWorks() {
        return {
          works: [
            {
              id: "work-marketing",
              teamId: "marketing",
              project: "智能客户洞察平台",
              status: "approved",
            },
          ],
        };
      },
    },
    resultSnapshotRepository: {
      async getLatestSnapshot() {
        return null;
      },
    },
    ...overrides,
  };
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

test("API responses allow the separated frontend origin with credentials", async (t) => {
  const server = createServer({ publicRoot: await fs.mkdtemp(path.join(os.tmpdir(), "ai-cors-")) });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${baseUrl}/api/health`, {
    headers: {
      Origin: "http://localhost:5174",
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5174");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
});

test("health API exposes backend runtime metadata for the admin console", async (t) => {
  const server = createServer({ publicRoot: await fs.mkdtemp(path.join(os.tmpdir(), "ai-health-runtime-")) });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${baseUrl}/api/health`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.status, "ok");
  assert.equal(payload.runtime.dataBackend, "json");
  assert.equal(payload.runtime.api, "server/index.js");
});

test("site bootstrap API composes public audience state from backend repositories", async (t) => {
  const publicRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ai-site-bootstrap-"));
  const server = createServer({
    publicRoot,
    ...createSiteBootstrapTestRepositories(),
  });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${baseUrl}/api/site/bootstrap`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.me.role, "public");
  assert.equal(payload.me.authenticated, false);
  assert.equal(payload.stage.voteStatus, "voting");
  assert.equal(payload.stage.voteWindowLabel, "决赛投票");
  assert.deepEqual(payload.stage.pointScale, [100, 85, 70, 55, 40]);
  assert.equal(payload.trainees.length, 1);
  assert.equal(payload.teams.length, 1);
  assert.equal(payload.works.length, 1);
  assert.equal(payload.vote.results[0].id, "marketing");
  assert.equal(payload.vote.myVoteTeamId, null);
  assert.equal(payload.vote.votersCount, 0);
  assert.equal(payload.result.published, false);

  const teamsResponse = await fetch(`${baseUrl}/api/teams`);
  const teams = await teamsResponse.json();

  assert.equal(teamsResponse.status, 200);
  assert.equal(teams[0].id, "marketing");
});

test("site bootstrap API resolves the logged-in audience vote from the session user", async (t) => {
  const publicRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ai-site-bootstrap-session-"));
  const server = createServer({
    publicRoot,
    ...createSiteBootstrapTestRepositories({
      voteResultsRepository: {
        async listVoteResults() {
          return {
            status: "voting",
            windowLabel: "决赛投票",
            pointScale: [100, 85, 70, 55, 40],
            results: [{ id: "marketing", name: "营销", votes: 9 }],
            voters: {
              "public-001": "marketing",
            },
          };
        },
      },
    }),
  });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const cookie = await loginAs(baseUrl, "public", { userId: "public-001", name: "观众用户" });
  const response = await fetch(`${baseUrl}/api/site/bootstrap`, {
    headers: { Cookie: cookie },
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.me.authenticated, true);
  assert.equal(payload.me.user.id, "public-001");
  assert.equal(payload.me.role, "public");
  assert.equal(payload.vote.myVoteTeamId, "marketing");
  assert.equal(payload.vote.votersCount, 1);
});

test("site bootstrap API keeps role-selection sessions from inheriting public vote permissions", async (t) => {
  const publicRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ai-site-bootstrap-pending-role-"));
  const server = createServer({
    publicRoot,
    ...createSiteBootstrapTestRepositories(),
    authSessionRepository: {
      async getSession() {
        return {
          id: "pending-role-session",
          role: "",
          roles: ["public", "judge"],
          user: { id: "pending-001", name: "待选角色用户" },
          permissions: {},
          source: "test-session",
        };
      },
    },
  });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${baseUrl}/api/site/bootstrap`, {
    headers: { Cookie: "joincare_session=pending-role-session" },
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.me.authenticated, true);
  assert.equal(payload.me.role, null);
  assert.deepEqual(payload.me.permissions, {});
  assert.equal(payload.vote.myVoteTeamId, null);
});

test("non-strict vote APIs still attach an existing session user to audience votes", async (t) => {
  const publicRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ai-site-vote-session-"));
  const votesFile = await createTempJsonFile("ai-site-vote-session-", "vote-results.json", {
    pointScale: [100, 85, 70, 55, 40],
    status: "voting",
    results: [
      { id: "marketing", name: "营销", votes: 8 },
      { id: "functions", name: "职能", votes: 3 },
    ],
    voters: {},
  });
  const sessionFile = await createTempJsonFile("ai-site-vote-session-auth-", "sessions.json", { sessions: {} });
  const voteResultsRepository = createVoteResultsRepository(votesFile.dataPath);
  const authSessionRepository = createAuthSessionRepository(sessionFile.dataPath);
  const server = createServer({
    publicRoot,
    ...createSiteBootstrapTestRepositories({ voteResultsRepository }),
    authSessionRepository,
  });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const cookie = await loginAs(baseUrl, "public", { userId: "public-123", name: "真实观众" });
  const castResponse = await fetch(`${baseUrl}/api/vote/cast`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ teamId: "marketing" }),
  });
  const castPayload = await castResponse.json();

  assert.equal(castResponse.status, 200);
  assert.equal(castPayload.userId, "public-123");

  const bootstrapResponse = await fetch(`${baseUrl}/api/site/bootstrap`, {
    headers: { Cookie: cookie },
  });
  const bootstrapPayload = await bootstrapResponse.json();

  assert.equal(bootstrapResponse.status, 200);
  assert.equal(bootstrapPayload.vote.myVoteTeamId, "marketing");

  const stored = JSON.parse(await fs.readFile(votesFile.dataPath, "utf8"));
  assert.equal(stored.voters["public-123"], "marketing");
  assert.equal(stored.voters["local-public"], undefined);
});

test("server enables strict auth enforcement from AUTH_ENFORCEMENT", async (t) => {
  const previousAuthEnforcement = process.env.AUTH_ENFORCEMENT;
  process.env.AUTH_ENFORCEMENT = "strict";
  t.after(() => {
    if (previousAuthEnforcement === undefined) {
      delete process.env.AUTH_ENFORCEMENT;
    } else {
      process.env.AUTH_ENFORCEMENT = previousAuthEnforcement;
    }
  });

  const { dataPath, publicRoot } = await createTempJsonFile("ai-env-strict-teams-", "teams.json", [
    {
      id: "marketing",
      name: "营销",
      capacity: 3,
      members: [],
    },
  ]);
  const sessionFile = await createTempJsonFile("ai-env-strict-sessions-", "sessions.json", { sessions: {} });
  const server = createServer({
    publicRoot,
    teamRepository: createTeamRepository(dataPath),
    authSessionRepository: createAuthSessionRepository(sessionFile.dataPath),
  });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${baseUrl}/api/team/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      teamId: "marketing",
      userId: "front-spoof",
      name: "前端模拟选手",
    }),
  });
  const payload = await response.json();

  assert.equal(response.status, 401);
  assert.match(payload.error.message, /Authentication required/);
});

test("frontend server serves static files and runtime API config separately from API", async (t) => {
  const publicRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ai-web-"));
  await fs.writeFile(path.join(publicRoot, "index.html"), "<!doctype html><title>web</title>");
  const server = createFrontendServer({
    publicRoot,
    apiBaseUrl: "http://localhost:63779",
  });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const configResponse = await fetch(`${baseUrl}/runtime-config.js`);
  const config = await configResponse.text();
  const apiResponse = await fetch(`${baseUrl}/api/health`);

  assert.equal(configResponse.status, 200);
  assert.match(config, /JOINCARE_API_BASE_URL/);
  assert.match(config, /http:\/\/localhost:63779/);
  assert.equal(apiResponse.status, 404);
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

test("API exposes Feishu auth placeholder and role permissions", async (t) => {
  const publicRoot = path.join(__dirname, "..");
  const server = createServer({ publicRoot });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const meResponse = await fetch(`${baseUrl}/api/me`);
  const me = await meResponse.json();

  assert.equal(meResponse.status, 200);
  assert.equal(me.role, null);
  assert.deepEqual(me.permissions, []);

  const permissionResponse = await fetch(`${baseUrl}/api/permissions?role=judge`);
  const permissions = await permissionResponse.json();

  assert.equal(permissionResponse.status, 200);
  assert.equal(permissions.role, "judge");
  assert.equal(permissions.permissions.canScore, true);
  assert.equal(permissions.permissions.canJoinTeam, false);

  const loginResponse = await fetch(`${baseUrl}/api/auth/feishu/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const login = await loginResponse.json();

  assert.equal(loginResponse.status, 200);
  assert.equal(login.configured, false);
  assert.equal(login.provider, "feishu");
});

test("auth APIs create local role sessions and resolve /api/me from cookie", async (t) => {
  const { dataPath, publicRoot } = await createTempJsonFile("ai-auth-", "sessions.json", {
    sessions: {},
  });
  const authSessionRepository = createAuthSessionRepository(dataPath);
  const server = createServer({ publicRoot, authSessionRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const loginResponse = await fetch(`${baseUrl}/api/auth/feishu/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: "judge",
      userId: "judge-001",
      name: "测试评委",
      department: "评审组",
    }),
  });
  const login = await loginResponse.json();
  const setCookie = loginResponse.headers.get("set-cookie");

  assert.equal(loginResponse.status, 200);
  assert.equal(login.configured, true);
  assert.equal(login.role, "judge");
  assert.equal(login.permissions.canScore, true);
  assert.match(setCookie, /joincare_session=/);

  const cookie = setCookie.split(";")[0];
  const meResponse = await fetch(`${baseUrl}/api/me`, {
    headers: { Cookie: cookie },
  });
  const me = await meResponse.json();

  assert.equal(meResponse.status, 200);
  assert.equal(me.role, "judge");
  assert.equal(me.user.name, "测试评委");
  assert.equal(me.permissions.canScore, true);

  const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  const logout = await logoutResponse.json();

  assert.equal(logoutResponse.status, 200);
  assert.equal(logout.accepted, true);

  const afterLogoutResponse = await fetch(`${baseUrl}/api/me`, {
    headers: { Cookie: cookie },
  });
  const afterLogout = await afterLogoutResponse.json();

  assert.equal(afterLogoutResponse.status, 200);
  assert.equal(afterLogout.role, null);
  assert.deepEqual(afterLogout.permissions, []);
});

test("Feishu OAuth start reports missing config before redirecting users", async (t) => {
  const server = createServer({ publicRoot: await fs.mkdtemp(path.join(os.tmpdir(), "ai-oauth-missing-")) });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${baseUrl}/api/auth/feishu/start`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.configured, false);
  assert.equal(payload.provider, "feishu");
  assert.equal(payload.reason, "missing-oauth-config");
});

test("Feishu OAuth callback creates a session from mapped Feishu user info", async (t) => {
  const userRolesFile = await createTempJsonFile("ai-oauth-user-roles-", "user-roles.json", {
    users: [
      {
        id: "feishu-user-001",
        openId: "ou_oauth_001",
        unionId: "on_oauth_001",
        name: "飞书评委",
        department: "评审组",
        roles: ["judge"],
        status: "active",
      },
    ],
  });
  const sessionsFile = await createTempJsonFile("ai-oauth-sessions-", "sessions.json", { sessions: {} });
  const states = new Map();
  const oauthStateRepository = {
    async createState(payload) {
      const state = `state-${states.size + 1}`;
      states.set(state, { ...payload, state });
      return { ...payload, state };
    },
    async consumeState(state) {
      const stored = states.get(state) || null;
      states.delete(state);
      return stored;
    },
  };
  const feishuOAuthProvider = {
    configured: true,
    createAuthorizationUrl({ state, redirectUri }) {
      return `https://feishu.test/oauth?state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    },
    async exchangeCodeForUser({ code }) {
      assert.equal(code, "oauth-code-001");
      return {
        id: "feishu-user-001",
        openId: "ou_oauth_001",
        unionId: "on_oauth_001",
        name: "飞书评委",
        department: "评审组",
        avatar: "https://feishu.test/avatar.png",
      };
    },
  };
  const server = createServer({
    publicRoot: userRolesFile.publicRoot,
    userRoleRepository: createUserRoleRepository(userRolesFile.dataPath),
    authSessionRepository: createAuthSessionRepository(sessionsFile.dataPath),
    oauthStateRepository,
    feishuOAuthProvider,
  });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const startResponse = await fetch(`${baseUrl}/api/auth/feishu/start?redirect=/site.html%23me`, {
    redirect: "manual",
  });
  const location = startResponse.headers.get("location");
  const state = new URL(location).searchParams.get("state");

  assert.equal(startResponse.status, 302);
  assert.match(location, /^https:\/\/feishu\.test\/oauth/);
  assert.ok(state);

  const callbackResponse = await fetch(`${baseUrl}/api/auth/feishu/callback?code=oauth-code-001&state=${state}`, {
    redirect: "manual",
  });
  const setCookie = callbackResponse.headers.get("set-cookie");

  assert.equal(callbackResponse.status, 302);
  assert.equal(callbackResponse.headers.get("location"), "/site.html#me");
  assert.match(setCookie, /joincare_session=/);

  const meResponse = await fetch(`${baseUrl}/api/me`, {
    headers: { Cookie: setCookie.split(";")[0] },
  });
  const me = await meResponse.json();

  assert.equal(me.role, "judge");
  assert.deepEqual(me.roles, ["judge"]);
  assert.equal(me.source, "feishu-oauth");
  assert.equal(me.user.openId, "ou_oauth_001");
  assert.equal(me.user.name, "飞书评委");
  assert.equal(me.permissions.canScore, true);
});

test("admin user role API maps Feishu login users to backend roles", async (t) => {
  const userRolesFile = await createTempJsonFile("ai-user-roles-", "user-roles.json", {
    users: [],
  });
  const sessionsFile = await createTempJsonFile("ai-user-role-sessions-", "sessions.json", {
    sessions: {},
  });
  const auditFile = await createTempJsonFile("ai-user-role-audit-", "audit-logs.json", {
    logs: [],
  });
  const userRoleRepository = createUserRoleRepository(userRolesFile.dataPath);
  const authSessionRepository = createAuthSessionRepository(sessionsFile.dataPath);
  const auditLogRepository = createAuditLogRepository(auditFile.dataPath);
  const server = createServer({
    publicRoot: userRolesFile.publicRoot,
    userRoleRepository,
    authSessionRepository,
    auditLogRepository,
  });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const upsertResponse = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "feishu-user-001",
      openId: "ou_001",
      unionId: "un_001",
      name: "飞书评委",
      department: "评审委员会",
      roles: ["judge"],
      actor: "admin-001",
    }),
  });
  const user = await upsertResponse.json();

  assert.equal(upsertResponse.status, 201);
  assert.equal(user.id, "feishu-user-001");
  assert.deepEqual(user.roles, ["judge"]);

  const usersResponse = await fetch(`${baseUrl}/api/admin/users`);
  const users = await usersResponse.json();
  assert.equal(users.users.length, 1);
  assert.equal(users.users[0].openId, "ou_001");

  const loginResponse = await fetch(`${baseUrl}/api/auth/feishu/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "feishu-user-001",
      name: "前端传入名称不应覆盖后端角色",
    }),
  });
  const login = await loginResponse.json();
  const cookie = loginResponse.headers.get("set-cookie").split(";")[0];

  assert.equal(loginResponse.status, 200);
  assert.equal(login.configured, true);
  assert.equal(login.source, "role-mapping");
  assert.equal(login.role, "judge");
  assert.equal(login.user.id, "feishu-user-001");
  assert.equal(login.user.name, "飞书评委");
  assert.equal(login.permissions.canScore, true);

  const meResponse = await fetch(`${baseUrl}/api/me`, {
    headers: { Cookie: cookie },
  });
  const me = await meResponse.json();
  assert.equal(me.role, "judge");
  assert.equal(me.user.openId, "ou_001");

  const auditLogs = JSON.parse(await fs.readFile(auditFile.dataPath, "utf8"));
  assert.equal(auditLogs.logs[0].action, "user.roles.updated");
  assert.equal(auditLogs.logs[0].targetId, "feishu-user-001");
});

test("strict auth enforcement rejects missing and wrong-role team writes", async (t) => {
  const { dataPath, publicRoot } = await createTempJsonFile("ai-strict-teams-", "teams.json", [
    {
      id: "marketing",
      name: "营销",
      capacity: 3,
      advisor: { name: "赛道顾问 C", role: "赛道顾问" },
      members: [],
    },
  ]);
  const sessionFile = await createTempJsonFile("ai-strict-auth-", "sessions.json", { sessions: {} });
  const teamRepository = createTeamRepository(dataPath);
  const authSessionRepository = createAuthSessionRepository(sessionFile.dataPath);
  const server = createServer({
    publicRoot,
    teamRepository,
    authSessionRepository,
    authEnforcement: "strict",
  });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const missingResponse = await fetch(`${baseUrl}/api/team/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamId: "marketing" }),
  });
  const missing = await missingResponse.json();

  assert.equal(missingResponse.status, 401);
  assert.match(missing.error.message, /Authentication required/);

  const judgeCookie = await loginAs(baseUrl, "judge", { userId: "judge-locked" });
  const wrongRoleResponse = await fetch(`${baseUrl}/api/team/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: judgeCookie },
    body: JSON.stringify({ teamId: "marketing" }),
  });
  const wrongRole = await wrongRoleResponse.json();

  assert.equal(wrongRoleResponse.status, 403);
  assert.match(wrongRole.error.message, /canJoinTeam/);

  const playerCookie = await loginAs(baseUrl, "player", {
    userId: "player-session",
    name: "Session 选手",
  });
  const allowedResponse = await fetch(`${baseUrl}/api/team/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: playerCookie },
    body: JSON.stringify({
      teamId: "marketing",
      userId: "payload-spoof",
      name: "Payload 冒名",
    }),
  });
  const allowed = await allowedResponse.json();

  assert.equal(allowedResponse.status, 200);
  assert.equal(allowed.member.userId, "player-session");
  assert.equal(allowed.member.name, "Session 选手");

  const stored = JSON.parse(await fs.readFile(dataPath, "utf8"));
  assert.equal(stored[0].members[0].userId, "player-session");
  assert.equal(stored[0].members[0].name, "Session 选手");
});

test("strict auth enforcement protects vote, score, work, and admin write APIs", async (t) => {
  const votesFile = await createTempJsonFile("ai-strict-votes-", "vote-results.json", {
    status: "voting",
    results: [{ id: "marketing", name: "营销", votes: 0 }],
  });
  const scoresFile = await createTempJsonFile("ai-strict-scores-", "judge-scores.json", { scores: {} });
  const worksFile = await createTempJsonFile("ai-strict-works-", "works.json", { works: [] });
  const auditFile = await createTempJsonFile("ai-strict-audit-", "audit-logs.json", { logs: [] });
  const sessionFile = await createTempJsonFile("ai-strict-sessions-", "sessions.json", { sessions: {} });
  const adminFile = await createTempJsonFile("ai-strict-admin-", "admin-state.json", {
    currentStageId: "team",
    stages: [
      { id: "team", name: "组队开启" },
      { id: "vote", name: "投票开启" },
    ],
    logs: [],
  });
  const server = createServer({
    publicRoot: votesFile.publicRoot,
    voteResultsRepository: createVoteResultsRepository(votesFile.dataPath),
    judgeScoresRepository: createJudgeScoresRepository(scoresFile.dataPath),
    worksRepository: createWorksRepository(worksFile.dataPath),
    auditLogRepository: createAuditLogRepository(auditFile.dataPath),
    authSessionRepository: createAuthSessionRepository(sessionFile.dataPath),
    adminStateRepository: createAdminStateRepository(adminFile.dataPath),
    authEnforcement: "strict",
  });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const playerCookie = await loginAs(baseUrl, "player", { userId: "player-001" });
  const publicCookie = await loginAs(baseUrl, "public", { userId: "public-001" });
  const judgeCookie = await loginAs(baseUrl, "judge", { userId: "judge-001" });
  const adminCookie = await loginAs(baseUrl, "admin", { userId: "admin-001" });

  const deniedVoteResponse = await fetch(`${baseUrl}/api/vote/cast`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: playerCookie },
    body: JSON.stringify({ teamId: "marketing" }),
  });
  assert.equal(deniedVoteResponse.status, 403);

  const voteResponse = await fetch(`${baseUrl}/api/vote/cast`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: publicCookie },
    body: JSON.stringify({ teamId: "marketing", userId: "spoof-public" }),
  });
  const vote = await voteResponse.json();
  assert.equal(voteResponse.status, 200);
  assert.equal(vote.userId, "public-001");

  const deniedScoreResponse = await fetch(`${baseUrl}/api/judge/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: publicCookie },
    body: JSON.stringify({ scores: { marketing: { innovation: 90 } } }),
  });
  assert.equal(deniedScoreResponse.status, 403);

  const scoreResponse = await fetch(`${baseUrl}/api/judge/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: judgeCookie },
    body: JSON.stringify({ judgeId: "spoof-judge", scores: { marketing: { innovation: 90 } } }),
  });
  const score = await scoreResponse.json();
  assert.equal(scoreResponse.status, 200);
  assert.equal(score.judgeId, "judge-001");

  const workResponse = await fetch(`${baseUrl}/api/work/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: playerCookie },
    body: JSON.stringify({
      teamId: "marketing",
      submittedBy: "spoof-player",
      project: "后端权限验证",
    }),
  });
  const work = await workResponse.json();
  assert.equal(workResponse.status, 201);
  assert.equal(work.work.submittedBy, "player-001");

  const deniedAdminResponse = await fetch(`${baseUrl}/api/admin/stage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: judgeCookie },
    body: JSON.stringify({ stageId: "vote" }),
  });
  assert.equal(deniedAdminResponse.status, 403);

  const adminResponse = await fetch(`${baseUrl}/api/admin/stage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ stageId: "vote", actor: "spoof-admin" }),
  });
  const adminState = await adminResponse.json();
  assert.equal(adminResponse.status, 200);
  assert.equal(adminState.currentStageId, "vote");

  const auditLogs = JSON.parse(await fs.readFile(auditFile.dataPath, "utf8"));
  assert.equal(auditLogs.logs[0].actor, "admin-001");
});

test("team action APIs persist joins, role claims, and leaves", async (t) => {
  const { dataPath, publicRoot } = await createTempJsonFile("ai-teams-", "teams.json", [
    {
      id: "marketing",
      name: "营销",
      capacity: 3,
      advisor: { name: "赛道顾问 C", role: "赛道顾问" },
      members: [],
    },
    {
      id: "functions",
      name: "职能",
      capacity: 3,
      advisor: { name: "赛道顾问 D", role: "赛道顾问" },
      members: [],
    },
  ]);
  const teamRepository = createTeamRepository(dataPath);
  const server = createServer({ publicRoot, teamRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const joinResponse = await fetch(`${baseUrl}/api/team/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      teamId: "marketing",
      userId: "player-001",
      name: "测试选手",
      department: "AI创新部",
    }),
  });
  const join = await joinResponse.json();

  assert.equal(joinResponse.status, 200);
  assert.equal(join.accepted, true);
  assert.equal(join.team.id, "marketing");
  assert.equal(join.member.name, "测试选手");

  const claimResponse = await fetch(`${baseUrl}/api/team/claim-role`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      teamId: "marketing",
      userId: "player-001",
      roleKey: "dev",
      duty: "AI 开发",
    }),
  });
  const claim = await claimResponse.json();

  assert.equal(claimResponse.status, 200);
  assert.equal(claim.accepted, true);
  assert.equal(claim.member.roleKey, "dev");
  assert.equal(claim.member.duty, "AI 开发");

  const storedAfterClaim = JSON.parse(await fs.readFile(dataPath, "utf8"));
  assert.equal(storedAfterClaim[0].members[0].userId, "player-001");
  assert.equal(storedAfterClaim[0].members[0].roleKey, "dev");

  const leaveResponse = await fetch(`${baseUrl}/api/team/leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      teamId: "marketing",
      userId: "player-001",
    }),
  });
  const leave = await leaveResponse.json();

  assert.equal(leaveResponse.status, 200);
  assert.equal(leave.accepted, true);
  assert.equal(leave.team.id, "marketing");

  const storedAfterLeave = JSON.parse(await fs.readFile(dataPath, "utf8"));
  assert.equal(storedAfterLeave[0].members.length, 0);
});

test("admin team member API lets admins add and remove roster members", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-admin-team-members-"));
  const dataPath = path.join(tempDir, "teams.json");
  const auditLogPath = path.join(tempDir, "audit-logs.json");
  await fs.writeFile(dataPath, `${JSON.stringify([
    {
      id: "marketing",
      name: "营销",
      capacity: 3,
      advisor: { name: "赛道顾问 C", role: "赛道顾问" },
      members: [],
    },
  ], null, 2)}\n`);
  await fs.writeFile(auditLogPath, `${JSON.stringify({ logs: [] }, null, 2)}\n`);

  const teamRepository = createTeamRepository(dataPath);
  const auditLogRepository = createAuditLogRepository(auditLogPath);
  const server = createServer({ publicRoot: tempDir, teamRepository, auditLogRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const addResponse = await fetch(`${baseUrl}/api/admin/team-members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      teamId: "marketing",
      userId: "admin-added-001",
      name: "后台补位选手",
      department: "AI创新部",
      roleKey: "pm",
      duty: "产品策划",
      actor: "admin-ui",
    }),
  });
  const addPayload = await addResponse.json();

  assert.equal(addResponse.status, 200);
  assert.equal(addPayload.accepted, true);
  assert.equal(addPayload.member.name, "后台补位选手");
  assert.equal(addPayload.member.roleKey, "pm");
  assert.equal(addPayload.team.members.length, 1);

  const storedAfterAdd = JSON.parse(await fs.readFile(dataPath, "utf8"));
  assert.equal(storedAfterAdd[0].members[0].userId, "admin-added-001");

  const removeResponse = await fetch(`${baseUrl}/api/admin/team-members`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      teamId: "marketing",
      userId: "admin-added-001",
      actor: "admin-ui",
    }),
  });
  const removePayload = await removeResponse.json();

  assert.equal(removeResponse.status, 200);
  assert.equal(removePayload.accepted, true);
  assert.equal(removePayload.team.members.length, 0);

  const storedAfterRemove = JSON.parse(await fs.readFile(dataPath, "utf8"));
  assert.equal(storedAfterRemove[0].members.length, 0);

  const auditState = JSON.parse(await fs.readFile(auditLogPath, "utf8"));
  assert.deepEqual(
    auditState.logs.map((entry) => entry.action),
    ["team.member.removed", "team.member.added"],
  );
});

test("admin team status API locks a track and blocks later joins", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-admin-team-status-"));
  const dataPath = path.join(tempDir, "teams.json");
  const auditLogPath = path.join(tempDir, "audit-logs.json");
  await fs.writeFile(dataPath, `${JSON.stringify([
    {
      id: "marketing",
      name: "营销",
      status: "open",
      capacity: 3,
      advisor: { name: "赛道顾问 C", role: "赛道顾问" },
      members: [],
    },
  ], null, 2)}\n`);
  await fs.writeFile(auditLogPath, `${JSON.stringify({ logs: [] }, null, 2)}\n`);

  const teamRepository = createTeamRepository(dataPath);
  const auditLogRepository = createAuditLogRepository(auditLogPath);
  const server = createServer({ publicRoot: tempDir, teamRepository, auditLogRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const lockResponse = await fetch(`${baseUrl}/api/admin/teams/marketing/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "locked",
      actor: "admin-ui",
    }),
  });
  const lockPayload = await lockResponse.json();

  assert.equal(lockResponse.status, 200);
  assert.equal(lockPayload.team.status, "locked");

  const joinResponse = await fetch(`${baseUrl}/api/team/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      teamId: "marketing",
      userId: "player-locked-out",
      name: "被锁定拦截的选手",
    }),
  });
  const joinPayload = await joinResponse.json();

  assert.equal(joinResponse.status, 409);
  assert.match(joinPayload.error.message, /locked/);

  const stored = JSON.parse(await fs.readFile(dataPath, "utf8"));
  assert.equal(stored[0].status, "locked");
  assert.equal(stored[0].members.length, 0);

  const auditState = JSON.parse(await fs.readFile(auditLogPath, "utf8"));
  assert.equal(auditState.logs[0].action, "team.status.updated");
  assert.equal(auditState.logs[0].targetId, "marketing");
});

test("vote APIs persist one vote per user and update ranked results", async (t) => {
  const { dataPath, publicRoot } = await createTempJsonFile("ai-votes-", "vote-results.json", {
    pointScale: [100, 85, 70, 55, 40],
    status: "voting",
    results: [
      { id: "marketing", name: "营销", votes: 1, expert: 93.2 },
      { id: "functions", name: "职能", votes: 0, expert: 87.4 },
    ],
  });
  const voteResultsRepository = createVoteResultsRepository(dataPath);
  const server = createServer({ publicRoot, voteResultsRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const castResponse = await fetch(`${baseUrl}/api/vote/cast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamId: "functions", userId: "public-001" }),
  });
  const cast = await castResponse.json();

  assert.equal(castResponse.status, 200);
  assert.equal(cast.accepted, true);
  assert.equal(cast.teamId, "functions");
  assert.equal(cast.results.find((team) => team.id === "functions").votes, 1);

  const duplicateResponse = await fetch(`${baseUrl}/api/vote/cast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamId: "marketing", userId: "public-001" }),
  });
  const duplicate = await duplicateResponse.json();

  assert.equal(duplicateResponse.status, 409);
  assert.equal(duplicate.error.statusCode, 409);
  assert.match(duplicate.error.message, /already voted/);

  const cancelResponse = await fetch(`${baseUrl}/api/vote/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamId: "functions", userId: "public-001" }),
  });
  const cancel = await cancelResponse.json();

  assert.equal(cancelResponse.status, 200);
  assert.equal(cancel.accepted, true);
  assert.equal(cancel.results.find((team) => team.id === "functions").votes, 0);

  const stored = JSON.parse(await fs.readFile(dataPath, "utf8"));
  assert.equal(stored.results.find((team) => team.id === "functions").votes, 0);
  assert.deepEqual(stored.voters, {});
});

test("admin vote window API closes voting and blocks later votes", async (t) => {
  const votesFile = await createTempJsonFile("ai-admin-vote-window-", "vote-results.json", {
    pointScale: [100, 85, 70, 55, 40],
    status: "voting",
    results: [
      { id: "marketing", name: "营销", votes: 1, expert: 93.2 },
      { id: "functions", name: "职能", votes: 0, expert: 87.4 },
    ],
  });
  const auditFile = await createTempJsonFile("ai-admin-vote-audit-", "audit-logs.json", { logs: [] });
  const voteResultsRepository = createVoteResultsRepository(votesFile.dataPath);
  const auditLogRepository = createAuditLogRepository(auditFile.dataPath);
  const server = createServer({
    publicRoot: votesFile.publicRoot,
    voteResultsRepository,
    auditLogRepository,
  });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const closeResponse = await fetch(`${baseUrl}/api/admin/vote-window`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "closed" }),
  });
  const closed = await closeResponse.json();

  assert.equal(closeResponse.status, 200);
  assert.equal(closed.status, "closed");
  assert.equal(closed.windowLabel, "投票已关闭");

  const castResponse = await fetch(`${baseUrl}/api/vote/cast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamId: "functions", userId: "public-002" }),
  });

  assert.equal(castResponse.status, 409);

  const storedVotes = JSON.parse(await fs.readFile(votesFile.dataPath, "utf8"));
  assert.equal(storedVotes.status, "closed");
  assert.equal(storedVotes.windowLabel, "投票已关闭");

  const auditLogs = JSON.parse(await fs.readFile(auditFile.dataPath, "utf8"));
  assert.equal(auditLogs.logs[0].action, "vote.window.updated");
  assert.equal(auditLogs.logs[0].targetId, "closed");
});

test("judge score API persists draft scores and reports received team ids", async (t) => {
  const { dataPath, publicRoot } = await createTempJsonFile("ai-scores-", "judge-scores.json", {
    scores: {},
  });
  const judgeScoresRepository = createJudgeScoresRepository(dataPath);
  const server = createServer({ publicRoot, judgeScoresRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${baseUrl}/api/judge/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      judgeId: "judge-001",
      scores: {
        marketing: { innovation: 92, business: 88 },
        functions: { innovation: 86 },
      },
    }),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.accepted, true);
  assert.deepEqual(payload.receivedTeamIds, ["marketing", "functions"]);
  assert.equal(payload.judgeId, "judge-001");

  const stored = JSON.parse(await fs.readFile(dataPath, "utf8"));
  assert.equal(stored.scores["judge-001"].marketing.innovation, 92);
  assert.equal(stored.scores["judge-001"].functions.innovation, 86);
});

test("work APIs persist submissions and admin review status", async (t) => {
  const { dataPath, publicRoot } = await createTempJsonFile("ai-works-", "works.json", {
    works: [],
  });
  const auditFile = await createTempJsonFile("ai-work-audit-", "audit-logs.json", {
    logs: [],
  });
  const worksRepository = createWorksRepository(dataPath);
  const auditLogRepository = createAuditLogRepository(auditFile.dataPath);
  const server = createServer({ publicRoot, worksRepository, auditLogRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const submitResponse = await fetch(`${baseUrl}/api/work/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      teamId: "marketing",
      teamName: "增长黑客",
      project: "全域内容生成引擎",
      pitch: "一键生成全渠道营销内容",
      stack: "LLM / Workflow",
      demoUrl: "https://demo.example.com",
      codeUrl: "https://git.example.com/team/marketing",
      docUrl: "https://feishu.example.com/doc",
      screenshots: "首页截图 / 看板截图",
    }),
  });
  const submitted = await submitResponse.json();

  assert.equal(submitResponse.status, 201);
  assert.equal(submitted.work.teamId, "marketing");
  assert.equal(submitted.work.status, "submitted");
  assert.deepEqual(submitted.work.stack, ["LLM", "Workflow"]);

  const reviewResponse = await fetch(`${baseUrl}/api/admin/works/marketing/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "published",
      reviewerId: "admin-001",
      reviewNote: "进入作品展厅",
    }),
  });
  const reviewed = await reviewResponse.json();

  assert.equal(reviewResponse.status, 200);
  assert.equal(reviewed.work.status, "published");
  assert.equal(reviewed.work.reviewedBy, "admin-001");

  const listResponse = await fetch(`${baseUrl}/api/works`);
  const works = await listResponse.json();

  assert.equal(listResponse.status, 200);
  assert.equal(works.length, 1);
  assert.equal(works[0].id, "marketing");

  const stored = JSON.parse(await fs.readFile(dataPath, "utf8"));
  assert.equal(stored.works[0].status, "published");
});

test("audit log API records backend write events", async (t) => {
  const { dataPath, publicRoot } = await createTempJsonFile("ai-audit-", "audit-logs.json", {
    logs: [],
  });
  const auditLogRepository = createAuditLogRepository(dataPath);
  const server = createServer({ publicRoot, auditLogRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${baseUrl}/api/admin/audit-logs`);
  const initial = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(initial.logs, []);

  await auditLogRepository.record({
    actor: "admin-001",
    action: "stage.changed",
    targetType: "stage",
    targetId: "team",
    message: "开启阶段【组队开启】",
  });

  const nextResponse = await fetch(`${baseUrl}/api/admin/audit-logs`);
  const next = await nextResponse.json();

  assert.equal(nextResponse.status, 200);
  assert.equal(next.logs.length, 1);
  assert.equal(next.logs[0].action, "stage.changed");
  assert.equal(next.logs[0].targetId, "team");
  assert.match(next.logs[0].id, /^audit_/);
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

test("admin result publish API creates a final result snapshot", async (t) => {
  const snapshotsFile = await createTempJsonFile("ai-result-snapshots-", "result-snapshots.json", {
    snapshots: [],
  });
  const auditFile = await createTempJsonFile("ai-result-audit-", "audit-logs.json", {
    logs: [],
  });
  const voteResultsRepository = {
    async listVoteResults() {
      return {
        pointScale: [100, 85, 70, 55, 40],
        status: "closed",
        results: [
          { id: "marketing", name: "营销", votes: 180, expert: 93.2 },
          { id: "pharma", name: "药学", votes: 148, expert: 91 },
          { id: "medicine", name: "医学", votes: 121, expert: 92 },
          { id: "production", name: "生产", votes: 92, expert: 88 },
          { id: "functions", name: "职能", votes: 67, expert: 87 },
        ],
      };
    },
  };
  const judgeScoresRepository = {
    async readState() {
      return {
        scores: {
          "judge-001": {
            marketing: { innovation: 94, business: 92 },
            pharma: { innovation: 91, business: 90 },
          },
          "judge-002": {
            marketing: { innovation: 95, business: 92 },
            pharma: { innovation: 90, business: 91 },
          },
        },
      };
    },
  };
  const resultSnapshotRepository = createResultSnapshotRepository(snapshotsFile.dataPath);
  const auditLogRepository = createAuditLogRepository(auditFile.dataPath);
  const server = createServer({
    publicRoot: snapshotsFile.publicRoot,
    voteResultsRepository,
    judgeScoresRepository,
    resultSnapshotRepository,
    auditLogRepository,
  });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const publishResponse = await fetch(`${baseUrl}/api/admin/results/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor: "admin-001" }),
  });
  const published = await publishResponse.json();

  assert.equal(publishResponse.status, 201);
  assert.equal(published.status, "published");
  assert.equal(published.publishedBy, "admin-001");
  assert.equal(published.results.length, 5);
  assert.equal(published.results[0].id, "marketing");
  assert.equal(published.results[0].isChampion, true);
  assert.equal(published.results[0].expertScore, 93.25);

  const latestResponse = await fetch(`${baseUrl}/api/results/latest`);
  const latest = await latestResponse.json();

  assert.equal(latestResponse.status, 200);
  assert.equal(latest.snapshot.id, published.id);
  assert.equal(latest.snapshot.results[0].id, "marketing");

  const stored = JSON.parse(await fs.readFile(snapshotsFile.dataPath, "utf8"));
  assert.equal(stored.snapshots.length, 1);
  assert.equal(stored.snapshots[0].publishedBy, "admin-001");

  const auditLogs = JSON.parse(await fs.readFile(auditFile.dataPath, "utf8"));
  assert.equal(auditLogs.logs[0].action, "result.published");
  assert.equal(auditLogs.logs[0].targetId, published.id);
});

test("admin / screen / big-screen pages require an admin session", async (t) => {
  const sessionsFile = await createTempJsonFile("ai-guard-sessions-", "sessions.json", { sessions: {} });
  const authSessionRepository = createAuthSessionRepository(sessionsFile.dataPath);
  const server = createServer({ publicRoot: path.join(__dirname, ".."), authSessionRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  // 非管理员访问受限页 → 302 跳回用户站并带 denied 标记。
  for (const target of ["/admin", "/screen", "/index.html", "/?screen=big"]) {
    const denied = await fetch(`${baseUrl}${target}`, { redirect: "manual" });
    assert.equal(denied.status, 302, `${target} should redirect non-admins`);
    assert.match(denied.headers.get("location"), /\/site\.html\?denied=1/);
  }

  // 管理员登录后可进后台。
  const login = await fetch(`${baseUrl}/api/auth/feishu/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "admin", userId: "admin-guard-1", name: "管理员" }),
  });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const response = await fetch(`${baseUrl}/admin`, { headers: { Cookie: cookie } });
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.match(html, /AI 星锐黑客松 管理后台/);
  assert.match(html, /id="stageRows"/);
  assert.match(html, /src="\.\/src\/admin\.js\?v=20260625-admin-user"/);
});

test("root serves the user site for everyone; big screen stays admin-only", async (t) => {
  const sessionsFile = await createTempJsonFile("ai-root-sessions-", "sessions.json", { sessions: {} });
  const authSessionRepository = createAuthSessionRepository(sessionsFile.dataPath);
  const server = createServer({ publicRoot: path.join(__dirname, ".."), authSessionRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  // 根 → 用户站（不再按 UA 派发），移动端与桌面端一致。
  for (const ua of [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  ]) {
    const response = await fetch(`${baseUrl}/`, { headers: { "User-Agent": ua } });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /src\/site\.js/);
  }

  // 管理员登录后通过 /?screen=big 进入大屏。
  const login = await fetch(`${baseUrl}/api/auth/feishu/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "admin", userId: "admin-root-1", name: "管理员" }),
  });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const big = await fetch(`${baseUrl}/?screen=big`, { headers: { Cookie: cookie } });
  const bigHtml = await big.text();

  assert.equal(big.status, 200);
  assert.match(bigHtml, /src\/app\.js/);
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
  const { dataPath, publicRoot, adminStateRepository, auditLogRepository } = await createTempAdminStateRepository({
    currentStageId: "team",
    updatedAt: "2026-05-22T06:00:00.000Z",
    stages: [
      { id: "team", name: "组队开启" },
      { id: "vote", name: "投票开启" },
    ],
    logs: [],
  });
  const server = createServer({ publicRoot, adminStateRepository, auditLogRepository });
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

test("admin display time API updates stage display times", async (t) => {
  const { dataPath, publicRoot, adminStateRepository, auditLogRepository } = await createTempAdminStateRepository({
    currentStageId: "team",
    updatedAt: "2026-05-22T06:00:00.000Z",
    stages: [
      { id: "team", name: "组队开启", time: "05-22 14:00\n进行中" },
      { id: "vote", name: "投票开启", time: "预计 05-24 10:00\n-" },
    ],
    logs: [],
  });
  const server = createServer({ publicRoot, adminStateRepository, auditLogRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${baseUrl}/api/admin/display-times`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      stages: [
        { id: "team", time: "06-23 14:20\n进行中" },
        { id: "vote", time: "06-23 15:30\n待开启" },
      ],
    }),
  });
  const state = await response.json();

  assert.equal(response.status, 200);
  assert.equal(state.stages[0].time, "06-23 14:20\n进行中");
  assert.equal(state.stages[1].time, "06-23 15:30\n待开启");
  assert.match(state.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(state.logs[0].message, /更新时间显示配置/);

  const storedState = JSON.parse(await fs.readFile(dataPath, "utf8"));
  assert.equal(storedState.stages[0].time, "06-23 14:20\n进行中");
});

test("admin stage API rejects unknown stage ids", async (t) => {
  const { publicRoot, adminStateRepository, auditLogRepository } = await createTempAdminStateRepository({
    currentStageId: "team",
    updatedAt: "2026-05-22T06:00:00.000Z",
    stages: [
      { id: "team", name: "组队开启" },
      { id: "vote", name: "投票开启" },
    ],
    logs: [],
  });
  const server = createServer({ publicRoot, adminStateRepository, auditLogRepository });
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

test("admin timer APIs control countdown and roadshow display times", async (t) => {
  const publicRoot = path.join(__dirname, "..");
  const auditFile = await createTempJsonFile("ai-timer-audit-", "audit-logs.json", {
    logs: [],
  });
  const auditLogRepository = createAuditLogRepository(auditFile.dataPath);
  const missionCountdownRepository = {
    state: { startedAt: null, durationMs: 86400000 },
    async getState() {
      return { ...this.state, serverNow: "2026-06-23T10:00:00.000Z" };
    },
    async startCountdown(payload = {}) {
      this.state = {
        ...this.state,
        startedAt: payload.startedAt || "2026-06-23T10:00:00.000Z",
        durationMs: payload.durationMs || this.state.durationMs,
      };
      return this.getState();
    },
    async updateState(payload = {}) {
      this.state = {
        ...this.state,
        startedAt: Object.hasOwn(payload, "startedAt") ? payload.startedAt : this.state.startedAt,
        durationMs: payload.durationMs || this.state.durationMs,
      };
      return this.getState();
    },
  };
  const roadshowRepository = {
    state: { currentTeamId: "marketing", nextTeamId: "functions", startedAt: null, durationMs: 900000, phase: "DEMO" },
    async getState() {
      return { ...this.state, serverNow: "2026-06-23T10:00:00.000Z" };
    },
    async startRoadshow(payload = {}) {
      this.state = {
        ...this.state,
        startedAt: payload.startedAt || "2026-06-23T10:00:00.000Z",
        durationMs: payload.durationMs || this.state.durationMs,
      };
      return this.getState();
    },
    async updateState(payload = {}) {
      this.state = {
        ...this.state,
        startedAt: Object.hasOwn(payload, "startedAt") ? payload.startedAt : this.state.startedAt,
        durationMs: payload.durationMs || this.state.durationMs,
      };
      return this.getState();
    },
  };
  const server = createServer({ publicRoot, missionCountdownRepository, roadshowRepository, auditLogRepository });
  const baseUrl = await listen(server);

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const countdownResponse = await fetch(`${baseUrl}/api/admin/mission-countdown`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startedAt: "2026-06-23T10:00:00.000Z",
      durationMs: 2 * 60 * 60 * 1000,
    }),
  });
  const countdown = await countdownResponse.json();

  assert.equal(countdownResponse.status, 200);
  assert.equal(countdown.startedAt, "2026-06-23T10:00:00.000Z");
  assert.equal(countdown.durationMs, 7200000);

  const roadshowResponse = await fetch(`${baseUrl}/api/admin/roadshow`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startedAt: "2026-06-23T10:10:00.000Z",
      durationMs: 8 * 60 * 1000,
    }),
  });
  const roadshow = await roadshowResponse.json();

  assert.equal(roadshowResponse.status, 200);
  assert.equal(roadshow.startedAt, "2026-06-23T10:10:00.000Z");
  assert.equal(roadshow.durationMs, 480000);
});
