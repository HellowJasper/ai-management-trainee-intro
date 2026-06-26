const test = require("node:test");
const assert = require("node:assert/strict");

const { createMysqlMissionCountdownRepository } = require("../server/mysqlMissionCountdownRepository");
const { createMysqlRoadshowRepository } = require("../server/mysqlRoadshowRepository");
const { createRepositoryBundle } = require("../server/repositoryFactory");

class MemoryMysqlTimerPool {
  constructor({
    mission = null,
    roadshow = null,
    teams = [],
  } = {}) {
    this.calls = [];
    this.mission = mission ? { ...mission } : null;
    this.roadshow = roadshow ? { ...roadshow } : null;
    this.teams = new Map(teams.map((team) => [team.id, {
      id: team.id,
      name: team.name || "",
      track_name: team.nameEn || team.track || "",
      project: team.project || "",
      meta_json: JSON.stringify(team),
    }]));
  }

  async execute(sql, params = []) {
    this.calls.push({ sql, params });
    const compactSql = sql.replace(/\s+/g, " ").trim().toLowerCase();

    if (compactSql.startsWith("select started_at, duration_ms from mission_countdowns where id")) {
      return [this.mission ? [{
        started_at: this.mission.startedAt,
        duration_ms: this.mission.durationMs,
      }] : []];
    }

    if (compactSql.startsWith("insert into mission_countdowns")) {
      const [, startedAt, durationMs] = params;
      this.mission = {
        startedAt,
        durationMs,
      };
      return [{ affectedRows: 1 }];
    }

    if (compactSql.startsWith("select current_team_id, next_team_id, phase, started_at, duration_ms from roadshow_sessions where id")) {
      return [this.roadshow ? [{
        current_team_id: this.roadshow.currentTeamId,
        next_team_id: this.roadshow.nextTeamId,
        phase: this.roadshow.phase,
        started_at: this.roadshow.startedAt,
        duration_ms: this.roadshow.durationMs,
      }] : []];
    }

    if (compactSql.startsWith("select id, name, track_name, project, meta_json from teams where id in")) {
      return [params
        .map((id) => this.teams.get(id))
        .filter(Boolean)
        .map((row) => ({ ...row }))];
    }

    if (compactSql.startsWith("insert into roadshow_sessions")) {
      const [, currentTeamId, nextTeamId, phase, startedAt, durationMs] = params;
      this.roadshow = {
        currentTeamId,
        nextTeamId,
        phase,
        startedAt,
        durationMs,
      };
      return [{ affectedRows: 1 }];
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  }
}

test("MySQL mission countdown repository preserves start and admin update behavior", async () => {
  const pool = new MemoryMysqlTimerPool();
  const repository = createMysqlMissionCountdownRepository(pool);

  const initial = await repository.getState();
  assert.equal(initial.startedAt, null);
  assert.equal(initial.durationMs, 129600000);
  assert.ok(initial.serverNow);

  const started = await repository.startCountdown({
    startedAt: "2026-06-24T01:00:00.000Z",
    durationMs: 3600000,
  });
  assert.equal(started.startedAt, "2026-06-24T01:00:00.000Z");
  assert.equal(started.durationMs, 3600000);

  const secondStart = await repository.startCountdown({
    startedAt: "2026-06-24T02:00:00.000Z",
    durationMs: 7200000,
  });
  assert.equal(secondStart.startedAt, "2026-06-24T01:00:00.000Z");
  assert.equal(secondStart.durationMs, 3600000);

  const reset = await repository.updateState({
    startedAt: null,
    durationMs: 129600000,
  });
  assert.equal(reset.startedAt, null);
  assert.equal(reset.durationMs, 129600000);
});

test("MySQL roadshow repository hydrates teams and preserves timer behavior", async () => {
  const pool = new MemoryMysqlTimerPool({
    teams: [
      {
        id: "marketing",
        index: "03",
        name: "营销",
        nameEn: "SALES & MARKETING",
        project: "全域内容生成引擎",
        color: "rgb(100, 232, 214)",
      },
      {
        id: "functions",
        index: "04",
        name: "职能",
        nameEn: "GENERAL FUNCTIONS",
        project: "职能流程自动化助手",
        color: "var(--neon-2)",
      },
    ],
  });
  const repository = createMysqlRoadshowRepository(pool);

  const initial = await repository.getState();
  assert.equal(initial.currentTeamId, "marketing");
  assert.equal(initial.currentTeam.name, "营销");
  assert.equal(initial.nextTeam.name, "职能");
  assert.equal(initial.durationMs, 900000);

  const started = await repository.startRoadshow({
    currentTeamId: "functions",
    nextTeamId: "marketing",
    startedAt: "2026-06-24T03:00:00.000Z",
    durationMs: 600000,
  });
  assert.equal(started.currentTeamId, "functions");
  assert.equal(started.currentTeam.name, "职能");
  assert.equal(started.startedAt, "2026-06-24T03:00:00.000Z");
  assert.equal(started.durationMs, 600000);

  const updated = await repository.updateState({
    currentTeamId: "marketing",
    nextTeamId: "functions",
    phase: "Q&A",
    startedAt: null,
  });
  assert.equal(updated.currentTeamId, "marketing");
  assert.equal(updated.phase, "Q&A");
  assert.equal(updated.startedAt, null);
});

test("repository factory wires MySQL timer repositories", async () => {
  const pool = new MemoryMysqlTimerPool();
  const bundle = createRepositoryBundle({
    dataBackend: "mysql",
    mysqlPool: pool,
  });

  assert.equal(typeof bundle.missionCountdownRepository.getState, "function");
  assert.equal(typeof bundle.roadshowRepository.getState, "function");
});
