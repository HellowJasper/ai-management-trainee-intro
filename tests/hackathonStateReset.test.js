const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { resetHackathonState } = require("../server/hackathonStateReset");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

class MemoryResetPool {
  constructor() {
    this.transactionEvents = [];
    this.tables = {
      trainees: [{ id: "jasper", name: "贾博深" }],
      users: [{ id: "u-admin", name: "管理员" }, { id: "u-public", name: "观众" }],
      role_assignments: [{ id: 1, user_id: "u-admin", role: "admin" }, { id: 2, user_id: "u-public", role: "public" }],
      teams: [
        {
          id: "pharma",
          name: "药学",
          track_code: "01",
          track_name: "PHARMACEUTICALS",
          project: "运行期项目",
          status: "locked",
          capacity: 5,
          sort_order: 1,
          meta_json: JSON.stringify({
            id: "pharma",
            name: "药学",
            color: "var(--neon)",
            project: "运行期项目",
            members: [{ name: "队员" }],
            advisor: { name: "队长" },
            expert: 91,
            votes: 148,
          }),
        },
      ],
      team_members: [{ team_id: "pharma", user_id: "u-player" }],
      works: [{ id: "pharma", team_id: "pharma", status: "submitted" }],
      vote_windows: [{ id: "main", status: "published", window_label: "结果已发布", point_scale_json: JSON.stringify([100, 85]) }],
      votes: [{ voter_id: "u-public", team_id: "pharma", status: "active" }],
      judge_scores: [{ judge_id: "judge-a", team_id: "pharma" }],
      event_stages: [{ id: "result", name: "结果发布", status: "active", display_time: "old", sort_order: 1 }],
      bigscreen_state: [{ id: "main", view_name: "stage", params_json: JSON.stringify({ stageId: "result" }) }],
      roadshow_sessions: [{ id: "main", current_team_id: "pharma", next_team_id: "pharma", phase: "DEMO", started_at: "2026-06-24 10:00:00", duration_ms: 600000 }],
      mission_countdowns: [{ id: "main", started_at: "2026-06-24 09:00:00", duration_ms: 600000 }],
      result_snapshots: [{ id: 1, status: "published" }],
      audit_logs: [{ id: 1, action: "result.published" }],
      auth_sessions: [{ id: "session-a" }],
      oauth_states: [{ state: "oauth-a" }],
    };
  }

  async getConnection() {
    this.transactionEvents.push("getConnection");
    return {
      execute: (sql, params) => this.execute(sql, params),
      beginTransaction: async () => this.transactionEvents.push("begin"),
      commit: async () => this.transactionEvents.push("commit"),
      rollback: async () => this.transactionEvents.push("rollback"),
      release: () => this.transactionEvents.push("release"),
    };
  }

  async execute(sql, params = []) {
    const compactSql = sql.replace(/\s+/g, " ").trim().toLowerCase();

    const countMatch = compactSql.match(/^select count\(\*\) as count from ([a-z_]+)$/);
    if (countMatch) {
      return [[{ count: this.tables[countMatch[1]].length }]];
    }

    const selectAllMatch = compactSql.match(/^select \* from ([a-z_]+)$/);
    if (selectAllMatch) {
      return [clone(this.tables[selectAllMatch[1]])];
    }

    const deleteMatch = compactSql.match(/^delete from ([a-z_]+)$/);
    if (deleteMatch) {
      const tableName = deleteMatch[1];
      const affectedRows = this.tables[tableName].length;
      this.tables[tableName] = [];
      return [{ affectedRows }];
    }

    if (compactSql.startsWith("delete from vote_windows where id <>")) {
      const before = this.tables.vote_windows.length;
      this.tables.vote_windows = this.tables.vote_windows.filter((row) => row.id === params[0]);
      return [{ affectedRows: before - this.tables.vote_windows.length }];
    }

    if (compactSql.startsWith("update teams set status")) {
      this.tables.teams = this.tables.teams.map((team) => {
        const meta = JSON.parse(team.meta_json);
        ["members", "advisor", "project", "expert", "votes"].forEach((key) => delete meta[key]);
        return {
          ...team,
          status: "open",
          project: "",
          meta_json: JSON.stringify(meta),
        };
      });
      return [{ affectedRows: this.tables.teams.length }];
    }

    if (compactSql.startsWith("insert into event_stages")) {
      const [id, name, subtitle, displayTime, status, sortOrder] = params;
      this.tables.event_stages.push({
        id,
        name,
        subtitle,
        display_time: displayTime,
        status,
        sort_order: sortOrder,
      });
      return [{ affectedRows: 1 }];
    }

    if (compactSql.startsWith("insert into vote_windows")) {
      const [id, status, windowLabel, pointScaleJson] = params;
      this.tables.vote_windows = this.tables.vote_windows.filter((row) => row.id !== id);
      this.tables.vote_windows.push({
        id,
        status,
        window_label: windowLabel,
        point_scale_json: pointScaleJson,
      });
      return [{ affectedRows: 1 }];
    }

    if (compactSql.startsWith("insert into mission_countdowns")) {
      const [id, startedAt, durationMs] = params;
      this.tables.mission_countdowns = this.tables.mission_countdowns.filter((row) => row.id !== id);
      this.tables.mission_countdowns.push({ id, started_at: startedAt, duration_ms: durationMs });
      return [{ affectedRows: 1 }];
    }

    if (compactSql.startsWith("insert into roadshow_sessions")) {
      const [id, currentTeamId, nextTeamId, phase, startedAt, durationMs] = params;
      this.tables.roadshow_sessions = this.tables.roadshow_sessions.filter((row) => row.id !== id);
      this.tables.roadshow_sessions.push({
        id,
        current_team_id: currentTeamId,
        next_team_id: nextTeamId,
        phase,
        started_at: startedAt,
        duration_ms: durationMs,
      });
      return [{ affectedRows: 1 }];
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  }
}

test("dry run reports reset impact without mutating data", async () => {
  const pool = new MemoryResetPool();
  const before = clone(pool.tables);

  const result = await resetHackathonState({
    pool,
    dryRun: true,
    backup: false,
  });

  assert.equal(result.dryRun, true);
  assert.equal(result.countsBefore.trainees, 1);
  assert.equal(result.countsBefore.users, 2);
  assert.equal(result.countsBefore.votes, 1);
  assert.deepEqual(pool.tables, before);
  assert.deepEqual(pool.transactionEvents, []);
});

test("execute preserves candidate and user data while resetting hackathon runtime state", async () => {
  const pool = new MemoryResetPool();
  const publicRoot = await fs.mkdtemp(path.join(os.tmpdir(), "hackathon-reset-public-"));
  const backupRoot = await fs.mkdtemp(path.join(os.tmpdir(), "hackathon-reset-backup-"));
  const workUploadDir = path.join(publicRoot, "assets/uploads/works/pharma");
  const traineeUploadDir = path.join(publicRoot, "assets/uploads/trainees/jasper");
  await fs.mkdir(workUploadDir, { recursive: true });
  await fs.mkdir(traineeUploadDir, { recursive: true });
  await fs.writeFile(path.join(workUploadDir, "shot.png"), "work-shot");
  await fs.writeFile(path.join(traineeUploadDir, "photo.png"), "trainee-photo");

  const result = await resetHackathonState({
    pool,
    dryRun: false,
    publicRoot,
    backupRoot,
    now: new Date("2026-06-29T10:00:00.000Z"),
  });

  assert.equal(result.dryRun, false);
  assert.equal(pool.tables.trainees.length, 1);
  assert.equal(pool.tables.users.length, 2);
  assert.equal(pool.tables.role_assignments.length, 2);
  assert.equal(pool.tables.teams.length, 1);
  assert.equal(pool.tables.teams[0].status, "open");
  assert.equal(pool.tables.teams[0].project, "");
  assert.deepEqual(JSON.parse(pool.tables.teams[0].meta_json), {
    id: "pharma",
    name: "药学",
    color: "var(--neon)",
  });
  assert.equal(pool.tables.team_members.length, 0);
  assert.equal(pool.tables.works.length, 0);
  assert.equal(pool.tables.votes.length, 0);
  assert.equal(pool.tables.judge_scores.length, 0);
  assert.equal(pool.tables.result_snapshots.length, 0);
  assert.equal(pool.tables.auth_sessions.length, 0);
  assert.equal(pool.tables.oauth_states.length, 0);
  assert.equal(pool.tables.audit_logs.length, 0);
  assert.equal(pool.tables.bigscreen_state.length, 0);
  assert.equal(pool.tables.vote_windows[0].status, "closed");
  assert.deepEqual(JSON.parse(pool.tables.vote_windows[0].point_scale_json), [100, 85, 70, 55, 40]);
  assert.equal(pool.tables.mission_countdowns[0].started_at, null);
  assert.equal(pool.tables.mission_countdowns[0].duration_ms, 129600000);
  assert.equal(pool.tables.roadshow_sessions[0].started_at, null);
  assert.equal(pool.tables.roadshow_sessions[0].duration_ms, 900000);
  assert.deepEqual(pool.tables.event_stages.map((stage) => `${stage.id}:${stage.status}`).slice(0, 3), [
    "opening:active",
    "icebreaker:pending",
    "speech:pending",
  ]);
  assert.deepEqual(pool.transactionEvents, ["getConnection", "begin", "commit", "release"]);
  await assert.rejects(() => fs.access(path.join(workUploadDir, "shot.png")));
  await fs.access(path.join(traineeUploadDir, "photo.png"));
  await fs.access(path.join(result.backupDir, "mysql/trainees.json"));
  await fs.access(path.join(result.backupDir, "assets/uploads/works/pharma/shot.png"));
});
