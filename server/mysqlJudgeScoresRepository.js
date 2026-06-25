const { createHttpError } = require("./traineeRepository");
const {
  JUDGE_SCORE_STATUSES,
  assertCompleteScores,
  buildJudgeProgress,
  calculateTotalScore,
  normalizeComments,
  normalizeJudgeId,
  normalizeRecord,
  normalizeState,
  normalizeTeamIds,
  normalizeTeamScores,
} = require("./judgeScoreDomain");

function parseJsonValue(value) {
  if (Buffer.isBuffer(value)) {
    return JSON.parse(value.toString("utf8"));
  }
  if (typeof value === "string" && value.trim()) {
    return JSON.parse(value);
  }
  if (value && typeof value === "object") {
    return value;
  }
  return {};
}

function normalizeDate(value) {
  if (!value) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function createMysqlJudgeScoresRepository(pool) {
  if (!pool || typeof pool.execute !== "function") {
    throw new Error("A mysql2-compatible pool with execute(sql, params) is required.");
  }

  async function readState() {
    const [rows] = await pool.execute(
      `SELECT judge_id, team_id, status, score_json, total_score, comment, submitted_at, updated_at
       FROM judge_scores
       ORDER BY judge_id ASC, team_id ASC`,
    );
    let updatedAt = "";
    const records = {};

    rows.forEach((row) => {
      const judgeId = String(row.judge_id || row.judgeId || "").trim();
      const teamId = String(row.team_id || row.teamId || "").trim();
      if (!judgeId || !teamId) {
        return;
      }
      if (!records[judgeId]) {
        records[judgeId] = {};
      }
      records[judgeId][teamId] = normalizeRecord({
        status: row.status,
        scores: parseJsonValue(row.score_json || row.scoreJson),
        totalScore: row.total_score ?? row.totalScore,
        comment: row.comment,
        submittedAt: normalizeDate(row.submitted_at || row.submittedAt),
        updatedAt: normalizeDate(row.updated_at || row.updatedAt),
      });
      updatedAt = normalizeDate(row.updated_at || row.updatedAt) || updatedAt;
    });

    return normalizeState({
      updatedAt,
      records,
    });
  }

  async function getExistingRecord(judgeId, teamId) {
    const [rows] = await pool.execute(
      `SELECT judge_id, team_id, status, score_json, total_score, comment, submitted_at, updated_at
       FROM judge_scores
       WHERE judge_id = ? AND team_id = ?
       LIMIT 1`,
      [judgeId, teamId],
    );
    if (!rows.length) {
      return null;
    }
    const row = rows[0];
    return normalizeRecord({
      status: row.status,
      scores: parseJsonValue(row.score_json || row.scoreJson),
      totalScore: row.total_score ?? row.totalScore,
      comment: row.comment,
      submittedAt: normalizeDate(row.submitted_at || row.submittedAt),
      updatedAt: normalizeDate(row.updated_at || row.updatedAt),
    });
  }

  async function saveDraft(payload = {}) {
    const judgeId = normalizeJudgeId(payload);
    if (!judgeId) {
      throw createHttpError(400, "judgeId is required.");
    }

    const scores = normalizeTeamScores(payload.scores);
    const comments = normalizeComments(payload.comments);
    const receivedTeamIds = Object.keys(scores);
    if (receivedTeamIds.length === 0) {
      throw createHttpError(400, "scores must include at least one team.");
    }

    await Promise.all(receivedTeamIds.map(async (teamId) => {
      const existing = await getExistingRecord(judgeId, teamId);
      if (existing && [JUDGE_SCORE_STATUSES.SUBMITTED, JUDGE_SCORE_STATUSES.LOCKED].includes(existing.status)) {
        throw createHttpError(409, `Score for team ${teamId} has already been submitted.`);
      }
      const teamScores = scores[teamId];
      const comment = Object.prototype.hasOwnProperty.call(comments, teamId) ? comments[teamId] : existing?.comment || "";
      return pool.execute(
        `INSERT INTO judge_scores (judge_id, team_id, status, score_json, total_score, comment, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL)
         ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          score_json = VALUES(score_json),
          total_score = VALUES(total_score),
          comment = VALUES(comment),
          submitted_at = NULL,
          updated_at = CURRENT_TIMESTAMP`,
        [
          judgeId,
          teamId,
          JUDGE_SCORE_STATUSES.DRAFT,
          JSON.stringify(teamScores),
          calculateTotalScore(teamScores),
          comment,
        ],
      );
    }));

    const nextState = await readState();
    return {
      accepted: true,
      judgeId,
      receivedTeamIds,
      updatedAt: nextState.updatedAt,
      scores: nextState.scores[judgeId] || {},
    };
  }

  async function saveScores(payload = {}) {
    return saveDraft(payload);
  }

  async function readMyScores(payload = {}) {
    const judgeId = normalizeJudgeId(payload);
    const state = await readState();
    return {
      judgeId,
      teams: ((state.records || {})[judgeId] || {}),
      scores: ((state.scores || {})[judgeId] || {}),
      updatedAt: state.updatedAt,
    };
  }

  async function submitScores(payload = {}) {
    const judgeId = normalizeJudgeId(payload);
    if (!judgeId) {
      throw createHttpError(400, "judgeId is required.");
    }

    const incomingScores = normalizeTeamScores(payload.scores);
    const incomingComments = normalizeComments(payload.comments);
    const state = await readState();
    const currentRecords = ((state.records || {})[judgeId] || {});
    const teamIds = normalizeTeamIds(payload.teamIds && payload.teamIds.length ? payload.teamIds : Object.keys({
      ...currentRecords,
      ...incomingScores,
    }));
    if (!teamIds.length) {
      throw createHttpError(400, "scores must include at least one team.");
    }

    await Promise.all(teamIds.map(async (teamId) => {
      const existing = currentRecords[teamId] ? normalizeRecord(currentRecords[teamId]) : normalizeRecord(await getExistingRecord(judgeId, teamId) || {});
      if (existing.status === JUDGE_SCORE_STATUSES.LOCKED) {
        throw createHttpError(423, `Score for team ${teamId} is locked.`);
      }
      if (existing.status === JUDGE_SCORE_STATUSES.SUBMITTED) {
        throw createHttpError(409, `Score for team ${teamId} has already been submitted.`);
      }
      const teamScores = incomingScores[teamId] || existing.scores || {};
      assertCompleteScores(teamScores, teamId);
      const comment = Object.prototype.hasOwnProperty.call(incomingComments, teamId) ? incomingComments[teamId] : existing.comment || "";
      return pool.execute(
        `INSERT INTO judge_scores (judge_id, team_id, status, score_json, total_score, comment, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          score_json = VALUES(score_json),
          total_score = VALUES(total_score),
          comment = VALUES(comment),
          submitted_at = COALESCE(judge_scores.submitted_at, CURRENT_TIMESTAMP),
          updated_at = CURRENT_TIMESTAMP`,
        [
          judgeId,
          teamId,
          JUDGE_SCORE_STATUSES.SUBMITTED,
          JSON.stringify(teamScores),
          calculateTotalScore(teamScores),
          comment,
        ],
      );
    }));

    const nextState = await readState();
    return {
      accepted: true,
      judgeId,
      submittedTeamIds: teamIds,
      status: JUDGE_SCORE_STATUSES.SUBMITTED,
      updatedAt: nextState.updatedAt,
      scores: nextState.scores[judgeId] || {},
      teams: nextState.records[judgeId] || {},
    };
  }

  async function getProgress(payload = {}) {
    return buildJudgeProgress({
      state: await readState(),
      teamIds: payload.teamIds || [],
      judges: payload.judges || [],
    });
  }

  async function lockScores(payload = {}) {
    const state = await readState();
    const progress = buildJudgeProgress({
      state,
      teamIds: payload.teamIds || [],
      judges: payload.judges || [],
    });
    if (!progress.judgeCount || !progress.teamCount) {
      throw createHttpError(409, "No judge scores are ready to lock.");
    }
    const incompleteJudges = progress.judges.filter((judge) => judge.submittedCount < judge.totalTeamCount);
    if (incompleteJudges.length) {
      throw createHttpError(409, "Some judges have not submitted all scores.");
    }

    await Promise.all(progress.judges.flatMap((judge) => progress.teams.map((team) => pool.execute(
      `UPDATE judge_scores
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE judge_id = ? AND team_id = ? AND status = ?`,
      [JUDGE_SCORE_STATUSES.LOCKED, judge.judgeId, team.teamId, JUDGE_SCORE_STATUSES.SUBMITTED],
    ))));

    const nextState = await readState();
    return {
      accepted: true,
      status: JUDGE_SCORE_STATUSES.LOCKED,
      updatedAt: nextState.updatedAt,
      progress: buildJudgeProgress({
        state: nextState,
        teamIds: payload.teamIds || [],
        judges: payload.judges || [],
      }),
    };
  }

  return {
    getProgress,
    lockScores,
    readMyScores,
    readState,
    saveDraft,
    saveScores,
    submitScores,
  };
}

module.exports = {
  createMysqlJudgeScoresRepository,
};
