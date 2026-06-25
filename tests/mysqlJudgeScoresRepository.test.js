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
      total_score: row.totalScore ?? null,
      comment: row.comment || "",
      status: row.status || "draft",
      submitted_at: row.submittedAt || null,
      updated_at: row.updatedAt || "2026-01-01T00:00:00.000Z",
    }));
  }

  async execute(sql, params = []) {
    this.calls.push({ sql, params });
    const compactSql = sql.replace(/\s+/g, " ").trim().toLowerCase();

    if (compactSql.startsWith("select judge_id, team_id, status, score_json, total_score, comment, submitted_at, updated_at from judge_scores order by")) {
      return [this.rows
        .slice()
        .sort((a, b) => a.judge_id.localeCompare(b.judge_id) || a.team_id.localeCompare(b.team_id))
        .map((row) => ({ ...row }))];
    }

    if (compactSql.startsWith("select judge_id, team_id, status, score_json, total_score, comment, submitted_at, updated_at from judge_scores where")) {
      const [judgeId, teamId] = params;
      const row = this.rows.find((entry) => entry.judge_id === judgeId && entry.team_id === teamId);
      return [row ? [{ ...row }] : []];
    }

    if (compactSql.startsWith("insert into judge_scores")) {
      const [judgeId, teamId, status, scoreJson, totalScore, comment] = params;
      const existing = this.rows.find((row) => row.judge_id === judgeId && row.team_id === teamId);
      const next = {
        judge_id: judgeId,
        team_id: teamId,
        status,
        score_json: scoreJson,
        total_score: totalScore,
        comment: comment || "",
        submitted_at: compactSql.includes("current_timestamp)") ? "2026-01-01T00:00:20.000Z" : null,
        updated_at: "2026-01-01T00:00:10.000Z",
      };
      if (existing) {
        Object.assign(existing, next);
      } else {
        this.rows.push(next);
      }
      return [{ affectedRows: 1 }];
    }

    if (compactSql.startsWith("update judge_scores set status = ?")) {
      const [status, judgeId, teamId, expectedStatus] = params;
      const existing = this.rows.find((row) => (
        row.judge_id === judgeId
        && row.team_id === teamId
        && row.status === expectedStatus
      ));
      if (existing) {
        existing.status = status;
        existing.updated_at = "2026-01-01T00:00:30.000Z";
      }
      return [{ affectedRows: existing ? 1 : 0 }];
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

test("MySQL judge scores repository submits and locks complete judge scores", async () => {
  const pool = new MemoryMysqlJudgeScoresPool();
  const repository = createMysqlJudgeScoresRepository(pool);
  const completeScores = {
    innovation: 100,
    engineering: 80,
    business: 60,
    feasibility: 40,
    presentation: 20,
  };

  const draft = await repository.saveDraft({
    judgeId: "judge-a",
    scores: { marketing: completeScores },
  });
  assert.equal(draft.accepted, true);
  assert.deepEqual(draft.scores.marketing, completeScores);

  const submitted = await repository.submitScores({
    judgeId: "judge-a",
    teamIds: ["marketing"],
    scores: { marketing: completeScores },
  });
  assert.equal(submitted.status, "submitted");
  assert.equal(submitted.teams.marketing.status, "submitted");
  assert.equal(submitted.teams.marketing.totalScore, 68);

  await assert.rejects(
    () => repository.saveDraft({
      judgeId: "judge-a",
      scores: { marketing: { ...completeScores, innovation: 90 } },
    }),
    /already been submitted/,
  );

  const locked = await repository.lockScores({
    teamIds: ["marketing"],
    judges: [{ id: "judge-a", name: "Judge A", roles: ["judge"] }],
  });
  assert.equal(locked.accepted, true);
  assert.equal(locked.status, "locked");
  assert.equal(locked.progress.locked, true);

  const mine = await repository.readMyScores({ judgeId: "judge-a" });
  assert.equal(mine.teams.marketing.status, "locked");
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
