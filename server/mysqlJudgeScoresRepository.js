const { createHttpError } = require("./traineeRepository");

function normalizeJudgeId(payload = {}) {
  return String(payload.judgeId || payload.userId || payload.openId || "local-judge").trim();
}

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

function normalizeScoreValue(value) {
  if (value === "") {
    return "";
  }

  const score = Number(value);
  if (!Number.isFinite(score)) {
    throw createHttpError(400, "Judge score values must be numbers.");
  }

  return Math.max(0, Math.min(100, score));
}

function normalizeTeamScores(scores = {}) {
  const normalized = {};

  Object.entries(scores || {}).forEach(([teamId, dimensions]) => {
    if (!teamId || !dimensions || typeof dimensions !== "object") {
      return;
    }

    normalized[teamId] = {};
    Object.entries(dimensions).forEach(([dimension, value]) => {
      normalized[teamId][dimension] = normalizeScoreValue(value);
    });
  });

  return normalized;
}

function calculateTotalScore(dimensions = {}) {
  const values = Object.values(dimensions)
    .filter((value) => value !== "")
    .map(Number)
    .filter(Number.isFinite);
  if (!values.length) {
    return null;
  }

  return Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(2));
}

function normalizeState(payload = {}) {
  return {
    updatedAt: payload.updatedAt || new Date().toISOString(),
    scores: payload.scores && typeof payload.scores === "object" ? payload.scores : {},
  };
}

function createMysqlJudgeScoresRepository(pool) {
  if (!pool || typeof pool.execute !== "function") {
    throw new Error("A mysql2-compatible pool with execute(sql, params) is required.");
  }

  async function readState() {
    const [rows] = await pool.execute(
      "SELECT judge_id, team_id, score_json, updated_at FROM judge_scores ORDER BY judge_id ASC, team_id ASC",
    );
    let updatedAt = "";
    const scores = {};

    rows.forEach((row) => {
      const judgeId = String(row.judge_id || row.judgeId || "").trim();
      const teamId = String(row.team_id || row.teamId || "").trim();
      if (!judgeId || !teamId) {
        return;
      }
      if (!scores[judgeId]) {
        scores[judgeId] = {};
      }
      scores[judgeId][teamId] = parseJsonValue(row.score_json || row.scoreJson);
      updatedAt = normalizeDate(row.updated_at || row.updatedAt) || updatedAt;
    });

    return normalizeState({
      updatedAt,
      scores,
    });
  }

  async function saveScores(payload = {}) {
    const judgeId = normalizeJudgeId(payload);
    if (!judgeId) {
      throw createHttpError(400, "judgeId is required.");
    }

    const scores = normalizeTeamScores(payload.scores);
    const receivedTeamIds = Object.keys(scores);
    if (receivedTeamIds.length === 0) {
      throw createHttpError(400, "scores must include at least one team.");
    }

    await Promise.all(receivedTeamIds.map((teamId) => {
      const teamScores = scores[teamId];
      return pool.execute(
        `INSERT INTO judge_scores (judge_id, team_id, status, score_json, total_score)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          score_json = VALUES(score_json),
          total_score = VALUES(total_score),
          updated_at = CURRENT_TIMESTAMP`,
        [
          judgeId,
          teamId,
          "draft",
          JSON.stringify(teamScores),
          calculateTotalScore(teamScores),
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

  return {
    readState,
    saveScores,
  };
}

module.exports = {
  createMysqlJudgeScoresRepository,
};
