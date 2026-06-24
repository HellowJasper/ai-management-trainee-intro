const test = require("node:test");
const assert = require("node:assert/strict");

const { createMysqlVoteResultsRepository } = require("../server/mysqlVoteResultsRepository");
const { createRepositoryBundle } = require("../server/repositoryFactory");

class MemoryMysqlVotePool {
  constructor({
    teams = [],
    votes = [],
    window = null,
  } = {}) {
    this.calls = [];
    this.window = window ? { ...window } : null;
    this.teams = new Map(teams.map((team, index) => [team.id, {
      id: team.id,
      name: team.name || "",
      track_name: team.track || team.nameEn || "",
      project: team.project || "",
      sort_order: team.sortOrder || index,
      meta_json: JSON.stringify(team),
    }]));
    this.votes = votes.map((vote, index) => ({
      id: index + 1,
      voter_id: vote.voterId,
      team_id: vote.teamId,
      status: vote.status || "active",
      source: vote.source || "web",
    }));
  }

  async execute(sql, params = []) {
    this.calls.push({ sql, params });
    const compactSql = sql.replace(/\s+/g, " ").trim().toLowerCase();

    if (compactSql.startsWith("select status, window_label, point_scale_json from vote_windows where id")) {
      return [this.window ? [{
        status: this.window.status,
        window_label: this.window.windowLabel,
        point_scale_json: JSON.stringify(this.window.pointScale || [100, 85, 70, 55, 40]),
      }] : []];
    }

    if (compactSql.startsWith("select id, name, track_name, project, sort_order, meta_json from teams order by")) {
      return [[...this.teams.values()].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))];
    }

    if (compactSql.startsWith("select team_id, count(*) as votes from votes where status")) {
      const counts = new Map();
      this.votes
        .filter((vote) => vote.status === "active")
        .forEach((vote) => counts.set(vote.team_id, (counts.get(vote.team_id) || 0) + 1));
      return [[...counts.entries()].map(([team_id, count]) => ({ team_id, votes: count }))];
    }

    if (compactSql.startsWith("select voter_id, team_id from votes where status")) {
      return [this.votes
        .filter((vote) => vote.status === "active")
        .map((vote) => ({ voter_id: vote.voter_id, team_id: vote.team_id }))];
    }

    if (compactSql.startsWith("select id from teams where id")) {
      const row = this.teams.get(params[0]);
      return [row ? [{ id: row.id }] : []];
    }

    if (compactSql.startsWith("select team_id from votes where voter_id")) {
      const current = this.votes.find((vote) => vote.voter_id === params[0] && vote.status === "active");
      return [current ? [{ team_id: current.team_id }] : []];
    }

    if (compactSql.startsWith("insert into votes")) {
      const [voterId, teamId, source] = params;
      this.votes.push({
        id: this.votes.length + 1,
        voter_id: voterId,
        team_id: teamId,
        status: "active",
        source,
      });
      return [{ affectedRows: 1 }];
    }

    if (compactSql.startsWith("update votes set status")) {
      const [voterId, teamId] = params;
      const current = this.votes.find((vote) => vote.voter_id === voterId && vote.team_id === teamId && vote.status === "active");
      if (!current) return [{ affectedRows: 0 }];
      current.status = "cancelled";
      return [{ affectedRows: 1 }];
    }

    if (compactSql.startsWith("insert into vote_windows")) {
      const [, status, windowLabel, pointScaleJson] = params;
      this.window = {
        status,
        windowLabel,
        pointScale: JSON.parse(pointScaleJson),
      };
      return [{ affectedRows: 1 }];
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  }
}

test("MySQL vote repository keeps the vote window and one-active-vote contract", async () => {
  const pool = new MemoryMysqlVotePool({
    window: {
      status: "voting",
      windowLabel: "投票窗口开启中",
      pointScale: [100, 85, 70, 55, 40],
    },
    teams: [
      { id: "marketing", name: "营销", track: "SALES & MARKETING", project: "全域内容生成引擎", color: "rgb(100, 232, 214)", expert: 93.2 },
      { id: "pharma", name: "药学", track: "PHARMACEUTICALS", project: "药物信息检索助手", color: "var(--neon)", expert: 91.6 },
    ],
    votes: [{ voterId: "u1", teamId: "marketing" }],
  });
  const repository = createMysqlVoteResultsRepository(pool);

  const before = await repository.listVoteResults();
  assert.equal(before.status, "voting");
  assert.equal(before.results.find((team) => team.id === "marketing").votes, 1);
  assert.equal(before.results.find((team) => team.id === "pharma").votes, 0);

  const cast = await repository.castVote({ teamId: "pharma", userId: "u2" });
  assert.equal(cast.accepted, true);
  assert.equal(cast.results.find((team) => team.id === "pharma").votes, 1);

  await assert.rejects(
    () => repository.castVote({ teamId: "pharma", userId: "u1" }),
    /already voted for marketing/,
  );

  const cancelled = await repository.cancelVote({ teamId: "pharma", userId: "u2" });
  assert.equal(cancelled.accepted, true);
  assert.equal(cancelled.results.find((team) => team.id === "pharma").votes, 0);

  const closed = await repository.updateWindowStatus({ status: "closed" });
  assert.equal(closed.status, "closed");
  assert.equal(closed.windowLabel, "投票已关闭");
  await assert.rejects(
    () => repository.castVote({ teamId: "pharma", userId: "u3" }),
    /Vote window is not open/,
  );
});

test("repository factory wires the MySQL vote results repository", async () => {
  const pool = new MemoryMysqlVotePool({
    teams: [{ id: "marketing", name: "营销" }],
  });
  const bundle = createRepositoryBundle({
    dataBackend: "mysql",
    mysqlPool: pool,
  });

  assert.equal(bundle.dataBackend, "mysql");
  assert.equal(typeof bundle.voteResultsRepository.listVoteResults, "function");

  const state = await bundle.voteResultsRepository.listVoteResults();
  assert.deepEqual(state.results.map((team) => team.id), ["marketing"]);
});
