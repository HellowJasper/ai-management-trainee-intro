const test = require("node:test");
const assert = require("node:assert/strict");

const { createRepositoryBundle } = require("../server/repositoryFactory");
const { createMysqlTeamRepository } = require("../server/mysqlTeamRepository");

class MemoryMysqlTeamPool {
  constructor({
    teams = [],
    members = [],
  } = {}) {
    this.calls = [];
    this.teams = new Map(teams.map((team, index) => [team.id, {
      id: team.id,
      name: team.name || "",
      track_code: team.index || team.trackCode || "",
      track_name: team.nameEn || team.trackName || "",
      project: team.project || "",
      status: team.status || "open",
      capacity: team.capacity || 5,
      sort_order: team.sortOrder || index,
      meta_json: JSON.stringify(team),
    }]));
    this.members = members.map((member, index) => ({
      id: index + 1,
      team_id: member.teamId,
      user_id: member.userId,
      name: member.name || "",
      department: member.department || "",
      role_key: member.roleKey || null,
      duty: member.duty || member.role || "",
      photo: member.photo || "",
      role: member.role || member.duty || "",
      is_advisor: Boolean(member.isAdvisor),
      joined_at: member.joinedAt || `2026-01-01T00:00:0${index}.000Z`,
    }));
  }

  async execute(sql, params = []) {
    this.calls.push({ sql, params });
    const compactSql = sql.replace(/\s+/g, " ").trim().toLowerCase();

    if (compactSql.startsWith("select id, name, track_code, track_name, project, status, capacity, sort_order, meta_json from teams order by")) {
      return [[...this.teams.values()].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))];
    }

    if (compactSql.startsWith("select team_id, user_id, name, department, role_key, duty,")) {
      return [this.members
        .slice()
        .sort((a, b) => a.id - b.id)
        .map((member) => ({ ...member }))];
    }

    if (compactSql.startsWith("select id from teams where id")) {
      const row = this.teams.get(params[0]);
      return [row ? [{ id: row.id }] : []];
    }

    if (compactSql.startsWith("delete from team_members where user_id")) {
      const userId = params[0];
      this.members = this.members.filter((member) => member.user_id !== userId);
      return [{ affectedRows: 1 }];
    }

    if (compactSql.startsWith("delete from team_members where team_id") && compactSql.includes("is_advisor = true") && params.length === 1) {
      const teamId = params[0];
      const before = this.members.length;
      this.members = this.members.filter((member) => !(member.team_id === teamId && member.is_advisor));
      return [{ affectedRows: before - this.members.length }];
    }

    if (compactSql.startsWith("insert into team_members")) {
      const [teamId, userId, name, department, roleKey, duty, photo, role, isAdvisor] = params;
      this.members.push({
        id: this.members.length + 1,
        team_id: teamId,
        user_id: userId,
        name,
        department,
        role_key: roleKey || null,
        duty,
        photo,
        role,
        is_advisor: Boolean(isAdvisor),
        joined_at: "2026-01-01T00:00:20.000Z",
      });
      return [{ affectedRows: 1 }];
    }

    if (compactSql.startsWith("delete from team_members where team_id")) {
      const [teamId, userId] = params;
      const before = this.members.length;
      this.members = this.members.filter((member) => !(member.team_id === teamId && member.user_id === userId));
      return [{ affectedRows: before - this.members.length }];
    }

    if (compactSql.startsWith("update team_members set role_key")) {
      const [roleKey, duty, role, teamId, userId] = params;
      const member = this.members.find((item) => item.team_id === teamId && item.user_id === userId);
      if (!member) return [{ affectedRows: 0 }];
      member.role_key = roleKey || null;
      member.duty = duty;
      member.role = role;
      return [{ affectedRows: 1 }];
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  }
}

test("MySQL team repository keeps the grouping and role claiming contract", async () => {
  const pool = new MemoryMysqlTeamPool({
    teams: [
      {
        id: "marketing",
        index: "03",
        name: "营销",
        nameEn: "SALES & MARKETING",
        hostDepartment: "健康品事业部",
        color: "rgb(100, 232, 214)",
        capacity: 5,
        advisor: { name: "队长 C", department: "健康品事业部", role: "队长" },
      },
      {
        id: "functions",
        index: "04",
        name: "职能",
        nameEn: "GENERAL FUNCTIONS",
        hostDepartment: "董事长办公室",
        color: "var(--neon-2)",
        capacity: 5,
        advisor: { name: "队长 D", department: "董事长办公室", role: "队长" },
      },
    ],
    members: [
      { teamId: "marketing", userId: "lead-marketing", name: "队长 C", department: "健康品事业部", roleKey: "advisor", duty: "队长", isAdvisor: true },
      { teamId: "marketing", userId: "player-a", name: "李蓓蓓", department: "健康品事业部", roleKey: "biz", duty: "业务洞察" },
      { teamId: "functions", userId: "player-b", name: "张瑞", department: "AI创新部", roleKey: "dev", duty: "AI开发" },
    ],
  });
  const repository = createMysqlTeamRepository(pool);

  const before = await repository.listTeams();
  assert.equal(before.length, 2);
  assert.equal(before[0].id, "marketing");
  assert.equal(before[0].advisor.name, "队长 C");
  assert.equal(before[0].advisor.userId, "lead-marketing");
  assert.deepEqual(before[0].members.map((member) => member.userId), ["player-a"]);

  const joined = await repository.joinTeam({
    teamId: "marketing",
    userId: "player-b",
    name: "张瑞",
    department: "AI创新部",
  });
  assert.equal(joined.accepted, true);
  assert.equal(joined.team.id, "marketing");
  assert.equal(joined.teams.find((team) => team.id === "functions").members.length, 0);
  assert.equal(joined.teams.find((team) => team.id === "marketing").members.length, 2);

  const claimed = await repository.claimRole({
    teamId: "marketing",
    userId: "player-b",
    roleKey: "pitch",
    duty: "路演运营",
  });
  assert.equal(claimed.member.roleKey, "pitch");
  assert.equal(claimed.member.duty, "路演运营");

  const left = await repository.leaveTeam({
    teamId: "marketing",
    userId: "player-b",
  });
  assert.equal(left.accepted, true);
  assert.equal(left.teams.find((team) => team.id === "marketing").members.some((member) => member.userId === "player-b"), false);

  const leader = await repository.joinTeam({
    teamId: "marketing",
    userId: "captain-new",
    name: "新队长",
    department: "AI创新部",
    roleKey: "advisor",
    duty: "队长",
  });
  assert.equal(leader.accepted, true);
  assert.equal(leader.team.advisor.userId, "captain-new");
  assert.equal(leader.team.members.some((member) => member.userId === "captain-new"), false);

  const removedLeader = await repository.leaveTeam({
    teamId: "marketing",
    userId: "captain-new",
    roleKey: "advisor",
  });
  assert.equal(removedLeader.accepted, true);
  assert.equal(removedLeader.team.advisor, null);
});

test("MySQL team repository blocks player roster changes after a team is locked", async () => {
  const pool = new MemoryMysqlTeamPool({
    teams: [
      {
        id: "marketing",
        index: "03",
        name: "营销",
        status: "locked",
        capacity: 5,
      },
    ],
    members: [
      { teamId: "marketing", userId: "player-a", name: "李蓓蓓", roleKey: "dev", duty: "AI 开发" },
    ],
  });
  const repository = createMysqlTeamRepository(pool);

  await assert.rejects(
    () => repository.leaveTeam({ teamId: "marketing", userId: "player-a" }),
    /Team marketing is locked/,
  );
  await assert.rejects(
    () => repository.claimRole({ teamId: "marketing", userId: "player-a", roleKey: "pitch", duty: "路演运营" }),
    /Team marketing is locked/,
  );

  assert.equal(pool.members.length, 1);
  assert.equal(pool.members[0].role_key, "dev");
});

test("repository factory wires the MySQL team repository", async () => {
  const pool = new MemoryMysqlTeamPool({
    teams: [{ id: "marketing", name: "营销", index: "03" }],
  });
  const bundle = createRepositoryBundle({
    dataBackend: "mysql",
    mysqlPool: pool,
  });

  assert.equal(bundle.dataBackend, "mysql");
  assert.equal(typeof bundle.teamRepository.listTeams, "function");

  const teams = await bundle.teamRepository.listTeams();
  assert.deepEqual(teams.map((team) => team.id), ["marketing"]);
});
