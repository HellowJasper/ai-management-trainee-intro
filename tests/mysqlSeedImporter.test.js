const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { seedMysqlFromJson, seedMysqlUsersFromJson } = require("../server/mysqlSeedImporter");

async function writeJson(dataDir, filename, payload) {
  await fs.writeFile(path.join(dataDir, filename), `${JSON.stringify(payload, null, 2)}\n`);
}

test("mysql seed importer loads current JSON fixtures into relational tables", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-mysql-seed-"));
  await writeJson(dataDir, "trainees.json", [
    {
      id: "jasper",
      name: "贾博深",
      romanName: "Jasper",
      department: "AI创新部",
      departmentEn: "AI INNOVATION",
      sentence: "Hello AI",
    },
  ]);
  await writeJson(dataDir, "teams.json", [
    {
      id: "marketing",
      index: "03",
      name: "营销",
      nameEn: "SALES & MARKETING",
      hostDepartment: "健康品事业部",
      project: "全域内容生成引擎",
      advisor: {
        name: "队长 C",
        department: "健康品事业部",
        role: "队长",
      },
      members: [
        {
          name: "贾博深",
          department: "AI创新部",
          role: "AI开发",
          roleKey: "dev",
          photo: "./assets/trainees/jasper/idPhoto.jpg",
        },
      ],
    },
  ]);
  await writeJson(dataDir, "user-roles.json", {
    users: [
      {
        id: "ou_admin",
        name: "管理员",
        department: "AI创新部",
        openId: "ou_admin",
        roles: ["admin", "judge"],
      },
    ],
  });
  await writeJson(dataDir, "admin-state.json", {
    currentStageId: "team",
    stages: [
      {
        id: "team",
        name: "组队开启",
        subtitle: "实时组队",
        time: "05-22 14:00",
        status: "active",
      },
    ],
  });
  await writeJson(dataDir, "mission-countdown.json", {
    startedAt: "2026-05-22T06:00:00.000Z",
    durationMs: 86400000,
  });
  await writeJson(dataDir, "roadshow.json", {
    currentTeamId: "marketing",
    nextTeamId: "functions",
    phase: "DEMO",
    startedAt: "2026-05-23T02:00:00.000Z",
    durationMs: 900000,
  });
  await writeJson(dataDir, "vote-results.json", {
    status: "voting",
    windowLabel: "投票窗口开启中",
    pointScale: [100, 85, 70, 55, 40],
    results: [
      {
        id: "marketing",
        votes: 2,
      },
    ],
  });
  await writeJson(dataDir, "works.json", {
    works: [
      {
        id: "work-marketing",
        teamId: "marketing",
        teamName: "营销",
        project: "全域内容生成引擎",
        pitch: "自动生成内容",
        stack: ["Node.js"],
        status: "approved",
      },
    ],
  });

  const executed = [];
  const pool = {
    async execute(sql, params = []) {
      executed.push({ sql, params });
      return [{ affectedRows: 1 }, []];
    },
  };

  const result = await seedMysqlFromJson({ dataDir, pool });
  const sqlText = executed.map((item) => item.sql).join("\n");

  assert.equal(result.trainees, 1);
  assert.equal(result.teams, 1);
  assert.equal(result.teamMembers, 2);
  assert.equal(result.users, 1);
  assert.equal(result.roleAssignments, 2);
  assert.equal(result.eventStages, 1);
  assert.equal(result.missionCountdowns, 1);
  assert.equal(result.roadshowSessions, 1);
  assert.equal(result.voteWindows, 1);
  assert.equal(result.votes, 2);
  assert.equal(result.works, 1);
  assert.match(sqlText, /INSERT INTO trainees/);
  assert.match(sqlText, /INSERT INTO teams/);
  assert.match(sqlText, /INSERT INTO team_members/);
  assert.match(sqlText, /INSERT INTO users/);
  assert.match(sqlText, /INSERT INTO role_assignments/);
  assert.match(sqlText, /INSERT INTO event_stages/);
  assert.match(sqlText, /INSERT INTO mission_countdowns/);
  assert.match(sqlText, /INSERT INTO roadshow_sessions/);
  assert.match(sqlText, /INSERT INTO vote_windows/);
  assert.match(sqlText, /INSERT INTO votes/);
  assert.match(sqlText, /INSERT INTO works/);
  assert.ok(executed.some((item) => item.params.includes("jasper")));
  assert.ok(executed.some((item) => item.params.includes("marketing")));
});

test("mysql user-only seed importer only writes users and role assignments", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-mysql-seed-users-"));
  await writeJson(dataDir, "user-roles.json", {
    users: [
      {
        id: "jkynewuser",
        name: "新增用户",
        department: "AI创新部",
        openId: "ou_new",
        roles: ["public", "player"],
      },
    ],
  });
  await writeJson(dataDir, "teams.json", [{ id: "marketing", name: "营销" }]);
  await writeJson(dataDir, "vote-results.json", { status: "voting", results: [{ id: "marketing", votes: 9 }] });
  await writeJson(dataDir, "works.json", { works: [{ id: "work-marketing", teamId: "marketing" }] });

  const executed = [];
  const pool = {
    async execute(sql, params = []) {
      executed.push({ sql, params });
      return [{ affectedRows: 1 }, []];
    },
  };

  const result = await seedMysqlUsersFromJson({ dataDir, pool });
  const sqlText = executed.map((item) => item.sql).join("\n");

  assert.deepEqual(result, { users: 1, roleAssignments: 2 });
  assert.match(sqlText, /INSERT INTO users/);
  assert.match(sqlText, /UPDATE role_assignments SET status = 'disabled'/);
  assert.match(sqlText, /INSERT INTO role_assignments/);
  assert.doesNotMatch(sqlText, /INSERT INTO teams/);
  assert.doesNotMatch(sqlText, /INSERT INTO team_members/);
  assert.doesNotMatch(sqlText, /INSERT INTO vote_windows/);
  assert.doesNotMatch(sqlText, /INSERT INTO votes/);
  assert.doesNotMatch(sqlText, /INSERT INTO works/);
});

test("mysql seed importer clears previous seed votes before importing aggregate vote counts", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-mysql-seed-votes-"));
  await writeJson(dataDir, "vote-results.json", {
    status: "voting",
    results: [
      { id: "marketing", votes: 1 },
    ],
  });

  const executed = [];
  const pool = {
    async execute(sql, params = []) {
      executed.push({ sql, params });
      return [{ affectedRows: 1 }, []];
    },
  };

  await seedMysqlFromJson({ dataDir, pool });

  const seedDeleteIndex = executed.findIndex((item) => (
    /delete from votes/i.test(item.sql) && item.params.includes("seed")
  ));
  const firstVoteInsertIndex = executed.findIndex((item) => /insert into votes/i.test(item.sql));

  assert.ok(seedDeleteIndex >= 0, "seed importer should delete previous seed votes");
  assert.ok(firstVoteInsertIndex > seedDeleteIndex, "seed votes must be cleared before importing new seed votes");
});

test("mysql seed importer avoids overwriting active non-seed voters when seed ids collide", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-mysql-seed-vote-collision-"));
  await writeJson(dataDir, "vote-results.json", {
    status: "voting",
    results: [
      { id: "marketing", votes: 1 },
    ],
  });

  const executed = [];
  const pool = {
    async execute(sql, params = []) {
      executed.push({ sql, params });
      if (/select voter_id from votes/i.test(sql)) {
        return [[{ voter_id: "seed-marketing-1" }]];
      }
      return [{ affectedRows: 1 }, []];
    },
  };

  await seedMysqlFromJson({ dataDir, pool });

  const seedInsert = executed.find((item) => /insert into votes/i.test(item.sql));
  assert.notEqual(seedInsert.params[0], "seed-marketing-1");
  assert.match(seedInsert.params[0], /^seed-marketing-1-/);
});

test("mysql seed importer closes a pool it creates internally", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-mysql-seed-"));
  const executed = [];
  let closed = false;
  const pool = {
    async execute(sql, params = []) {
      executed.push({ sql, params });
      return [{ affectedRows: 1 }, []];
    },
    async end() {
      closed = true;
    },
  };

  const result = await seedMysqlFromJson({
    dataDir,
    createPool: () => pool,
  });

  assert.equal(result.voteWindows, 1);
  assert.ok(executed.some((item) => item.sql.includes("INSERT INTO vote_windows")));
  assert.equal(closed, true);
});

test("mysql seed importer does not close a caller-owned pool", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-mysql-seed-"));
  let closed = false;
  const pool = {
    async execute() {
      return [{ affectedRows: 1 }, []];
    },
    async end() {
      closed = true;
    },
  };

  await seedMysqlFromJson({ dataDir, pool });

  assert.equal(closed, false);
});
