const { createHttpError } = require("./traineeRepository");

const JUDGE_SCORE_STATUSES = Object.freeze({
  DRAFT: "draft",
  SUBMITTED: "submitted",
  LOCKED: "locked",
});

const SCORE_DIMENSIONS = Object.freeze([
  { key: "innovation", legacyKey: "0", label: "创新性", weight: 25 },
  { key: "engineering", legacyKey: "1", label: "技术实现", weight: 25 },
  { key: "business", legacyKey: "2", label: "业务价值", weight: 25 },
  { key: "feasibility", legacyKey: "3", label: "可行性", weight: 15 },
  { key: "presentation", legacyKey: "4", label: "演示表现", weight: 10 },
]);

const DIMENSION_KEYS = SCORE_DIMENSIONS.map((dimension) => dimension.key);
const LEGACY_TO_DIMENSION = SCORE_DIMENSIONS.reduce((map, dimension) => {
  map[dimension.legacyKey] = dimension.key;
  return map;
}, {});

function normalizeJudgeId(payload = {}) {
  return String(payload.judgeId || payload.userId || payload.openId || "local-judge").trim();
}

function normalizeTeamIds(teamIds = []) {
  return Array.from(new Set((Array.isArray(teamIds) ? teamIds : [teamIds])
    .map((teamId) => String(teamId || "").trim())
    .filter(Boolean)));
}

function normalizeScoreValue(value) {
  if (value === "" || value === null || typeof value === "undefined") {
    return "";
  }

  const score = Number(value);
  if (!Number.isFinite(score)) {
    throw createHttpError(400, "Judge score values must be numbers.");
  }

  return Math.max(0, Math.min(100, score));
}

function normalizeDimensionKey(key) {
  const cleanKey = String(key || "").trim();
  return LEGACY_TO_DIMENSION[cleanKey] || cleanKey;
}

function normalizeDimensionScores(dimensions = {}) {
  const normalized = {};

  Object.entries(dimensions || {}).forEach(([rawKey, value]) => {
    const key = normalizeDimensionKey(rawKey);
    if (!DIMENSION_KEYS.includes(key)) {
      return;
    }
    normalized[key] = normalizeScoreValue(value);
  });

  return normalized;
}

function normalizeTeamScores(scores = {}) {
  const normalized = {};

  Object.entries(scores || {}).forEach(([teamId, dimensions]) => {
    const cleanTeamId = String(teamId || "").trim();
    if (!cleanTeamId || !dimensions || typeof dimensions !== "object") {
      return;
    }

    normalized[cleanTeamId] = normalizeDimensionScores(dimensions);
  });

  return normalized;
}

function normalizeComments(comments = {}) {
  return Object.entries(comments || {}).reduce((next, [teamId, comment]) => {
    const cleanTeamId = String(teamId || "").trim();
    if (cleanTeamId) {
      next[cleanTeamId] = String(comment || "").trim();
    }
    return next;
  }, {});
}

function isCompleteScoreSet(scores = {}) {
  return SCORE_DIMENSIONS.every((dimension) => {
    const value = scores[dimension.key];
    return value !== "" && Number.isFinite(Number(value));
  });
}

function assertCompleteScores(scores = {}, teamId = "") {
  const missing = SCORE_DIMENSIONS
    .filter((dimension) => {
      const value = scores[dimension.key];
      return value === "" || !Number.isFinite(Number(value));
    })
    .map((dimension) => dimension.key);

  if (missing.length) {
    throw createHttpError(409, `Team ${teamId || "score"} is missing judge score dimensions: ${missing.join(", ")}.`);
  }
}

function calculateTotalScore(dimensions = {}) {
  if (!isCompleteScoreSet(dimensions)) {
    return null;
  }

  const total = SCORE_DIMENSIONS.reduce((sum, dimension) => (
    sum + Number(dimensions[dimension.key]) * (dimension.weight / 100)
  ), 0);
  return Number(total.toFixed(2));
}

function normalizeRecord(record = {}) {
  const scores = normalizeDimensionScores(record.scores || record.scoreJson || record.score_json || {});
  return {
    status: String(record.status || JUDGE_SCORE_STATUSES.DRAFT).trim() || JUDGE_SCORE_STATUSES.DRAFT,
    scores,
    totalScore: record.totalScore === null || typeof record.totalScore === "undefined"
      ? calculateTotalScore(scores)
      : Number(record.totalScore),
    comment: String(record.comment || "").trim(),
    submittedAt: record.submittedAt || record.submitted_at || "",
    updatedAt: record.updatedAt || record.updated_at || "",
  };
}

function recordsFromScores(scores = {}) {
  const records = {};

  Object.entries(scores || {}).forEach(([judgeId, judgeScores]) => {
    const cleanJudgeId = String(judgeId || "").trim();
    if (!cleanJudgeId || !judgeScores || typeof judgeScores !== "object") {
      return;
    }
    records[cleanJudgeId] = {};
    Object.entries(judgeScores).forEach(([teamId, dimensions]) => {
      const cleanTeamId = String(teamId || "").trim();
      if (!cleanTeamId) {
        return;
      }
      records[cleanJudgeId][cleanTeamId] = normalizeRecord({ scores: dimensions });
    });
  });

  return records;
}

function scoresFromRecords(records = {}) {
  const scores = {};

  Object.entries(records || {}).forEach(([judgeId, judgeRecords]) => {
    if (!judgeRecords || typeof judgeRecords !== "object") {
      return;
    }
    scores[judgeId] = {};
    Object.entries(judgeRecords).forEach(([teamId, record]) => {
      scores[judgeId][teamId] = normalizeRecord(record).scores;
    });
  });

  return scores;
}

function normalizeState(payload = {}) {
  const records = payload.records && typeof payload.records === "object"
    ? payload.records
    : recordsFromScores(payload.scores || {});
  return {
    updatedAt: payload.updatedAt || new Date().toISOString(),
    scores: scoresFromRecords(records),
    records,
  };
}

function effectiveRecordsForTeam(judgeState = {}, teamId) {
  const state = normalizeState(judgeState);
  return Object.values(state.records || {})
    .map((judgeRecords) => normalizeRecord(judgeRecords?.[teamId] || {}))
    .filter((record) => [JUDGE_SCORE_STATUSES.SUBMITTED, JUDGE_SCORE_STATUSES.LOCKED].includes(record.status));
}

function buildJudgeProgress({ state = {}, teamIds = [], judges = [] } = {}) {
  const normalizedState = normalizeState(state);
  const allTeamIds = normalizeTeamIds(teamIds.length
    ? teamIds
    : Object.values(normalizedState.records).flatMap((judgeRecords) => Object.keys(judgeRecords || {})));
  const judgeMap = new Map();

  (Array.isArray(judges) ? judges : []).forEach((judge) => {
    const judgeId = String(judge.id || judge.userId || "").trim();
    if (judgeId) {
      judgeMap.set(judgeId, judge);
    }
  });
  Object.keys(normalizedState.records || {}).forEach((judgeId) => {
    if (!judgeMap.has(judgeId)) {
      judgeMap.set(judgeId, { id: judgeId, name: judgeId, roles: ["judge"] });
    }
  });

  const judgeRows = Array.from(judgeMap.values()).map((judge) => {
    const judgeId = String(judge.id || judge.userId || "").trim();
    const judgeRecords = normalizedState.records[judgeId] || {};
    let submittedCount = 0;
    let draftCount = 0;
    let lockedCount = 0;
    const teams = {};

    allTeamIds.forEach((teamId) => {
      const record = judgeRecords[teamId] ? normalizeRecord(judgeRecords[teamId]) : null;
      const status = record ? record.status : "missing";
      if (status === JUDGE_SCORE_STATUSES.LOCKED) lockedCount += 1;
      if (status === JUDGE_SCORE_STATUSES.SUBMITTED || status === JUDGE_SCORE_STATUSES.LOCKED) submittedCount += 1;
      if (status === JUDGE_SCORE_STATUSES.DRAFT) draftCount += 1;
      teams[teamId] = record ? {
        status,
        totalScore: record.totalScore,
        submittedAt: record.submittedAt,
        updatedAt: record.updatedAt,
      } : { status: "missing", totalScore: null, submittedAt: "", updatedAt: "" };
    });

    const missingCount = Math.max(0, allTeamIds.length - submittedCount - draftCount);
    return {
      judgeId,
      name: judge.name || judgeId,
      department: judge.department || "",
      submittedCount,
      draftCount,
      lockedCount,
      missingCount,
      totalTeamCount: allTeamIds.length,
      status: allTeamIds.length && lockedCount === allTeamIds.length
        ? JUDGE_SCORE_STATUSES.LOCKED
        : allTeamIds.length && submittedCount === allTeamIds.length
          ? JUDGE_SCORE_STATUSES.SUBMITTED
          : draftCount
            ? JUDGE_SCORE_STATUSES.DRAFT
            : "pending",
      teams,
    };
  });

  const teamRows = allTeamIds.map((teamId) => {
    const records = Array.from(judgeMap.keys())
      .map((judgeId) => normalizeRecord(normalizedState.records[judgeId]?.[teamId] || {}))
      .filter((record) => [JUDGE_SCORE_STATUSES.SUBMITTED, JUDGE_SCORE_STATUSES.LOCKED].includes(record.status));
    const totalScores = records
      .map((record) => Number(record.totalScore))
      .filter(Number.isFinite);
    return {
      teamId,
      submittedJudgeCount: records.length,
      averageScore: totalScores.length
        ? Number((totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length).toFixed(2))
        : null,
    };
  });

  const expectedScoreCount = judgeRows.length * allTeamIds.length;
  const lockedScoreCount = judgeRows.reduce((sum, judge) => sum + judge.lockedCount, 0);
  return {
    locked: expectedScoreCount > 0 && lockedScoreCount === expectedScoreCount,
    judgeCount: judgeRows.length,
    teamCount: allTeamIds.length,
    judges: judgeRows,
    teams: teamRows,
  };
}

module.exports = {
  DIMENSION_KEYS,
  JUDGE_SCORE_STATUSES,
  SCORE_DIMENSIONS,
  assertCompleteScores,
  buildJudgeProgress,
  calculateTotalScore,
  effectiveRecordsForTeam,
  isCompleteScoreSet,
  normalizeComments,
  normalizeJudgeId,
  normalizeRecord,
  normalizeState,
  normalizeTeamIds,
  normalizeTeamScores,
};
