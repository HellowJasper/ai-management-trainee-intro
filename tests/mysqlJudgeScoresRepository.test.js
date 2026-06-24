const test = require("node:test");
const assert = require("node:assert/strict");

const { createMysqlJudgeScoresRepository } = require("../server/mysqlJudgeScoresRepository");
const { createRepositoryBundle } = require("../server/repositoryFactory");

class MemoryMysqlJudgeScoresPool {
  constructor(rows = []) {
    this.calls = [];
    this.rows = rows.map((row) => ({
      judge_id: row.judgeId,
      team_id: row.teamId,
      score_json: JSON.stringify(row.scores || {}),
      total_score: row.totalScore || null,
      status: row.status || "draft",
      updated_at: row.updatedAt || "2026-01-01T00:00:00.000Z",
    }));
  }

  async execute(sql, params = []) {
    this.calls.push({ sql, params });
    const compactSql = sql.replace(/\s+/g, " ").trim().toLowerCase();

    if (compactSql.startsWith("select judge_id, team_id, score_json, updated_at from judge_scores order by")) {
      return [this.rows
        .slice()
        .sort((a, b) => a.judge_id.localeCompare(b.judge_id) || a.team_id.localeCompare(b.team_id))
        .map((row) => ({ ...row }))];
    }

    if (compactSql.startsWith("insert into judge_scores")) {
      const [judgeId, teamId, status, scoreJson, totalScore] = params;
      const existing = this.rows.find((row) => row.judge_id === judgeId && row.team_id === teamId);
      const next = {
        judge_id: judgeId,
        team_id: teamId,
        status,
        score_json: scoreJson,
        total_score: totalScore,
        updated_at: "2026-01-01T00:00:10.000Z",
      };
      if (existing) {
        Object.assign(existing, next);
      } else {
        this.rows.push(next);
      }
      return [{ affectedRows: 1 }];
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  }
}

test("MySQL judge scores repository preserves the draft score state contract", async () => {
  const pool = new MemoryMysqlJudgeScoresPool([
    {
      judgeId: "judge-a",
      teamId: "marketing",
      scores: { innovation: 90, business: 88 },
    },
  ]);
  const repository = createMysqlJudgeScoresRepository(pool);

  const before = await repository.readState();
  assert.deepEqual(before.scores["judge-a"].marketing, { innovation: 90, business: 88 });

  const saved = await repository.saveScores({
    judgeId: "judge-a",
    scores: {
      marketing: { innovation: 95, business: 91 },
      pharma: { innovation: 86, business: "" },
    },
  });

  assert.equal(saved.accepted, true);
  assert.equal(saved.judgeId, "judge-a");
  assert.deepEqual(saved.receivedTeamIds, ["marketing", "pharma"]);
  assert.deepEqual(saved.scores.marketing, { innovation: 95, business: 91 });
  assert.deepEqual(saved.scores.pharma, { innovation: 86, business: "" });

  const after = await repository.readState();
  assert.deepEqual(after.scores["judge-a"].pharma, { innovation: 86, business: "" });
});

test("repository factory wires the MySQL judge scores repository", async () => {
  const pool = new MemoryMysqlJudgeScoresPool();
  const bundle = createRepositoryBundle({
    dataBackend: "mysql",
    mysqlPool: pool,
  });

  assert.equal(bundle.dataBackend, "mysql");
  assert.equal(typeof bundle.judgeScoresRepository.saveScores, "function");
});
