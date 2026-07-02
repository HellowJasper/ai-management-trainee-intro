const { computeFinalResults } = require("../src/logic");
const { createHttpError } = require("./traineeRepository");
const {
  effectiveRecordsForTeam,
  normalizeRecord,
  normalizeState,
} = require("./judgeScoreDomain");

function averageNumericValues(values = []) {
  const numericValues = values
    .map(Number)
    .filter(Number.isFinite);
  if (!numericValues.length) {
    return null;
  }
  return Number((numericValues.reduce((total, value) => total + value, 0) / numericValues.length).toFixed(2));
}

function getJudgeTeamAverage(teamScores = {}) {
  return averageNumericValues(Object.values(teamScores || {}));
}

function getExpertScoresForTeam(judgeState = {}, teamId) {
  const records = judgeState && judgeState.records && typeof judgeState.records === "object"
    ? effectiveRecordsForTeam(judgeState, teamId)
    : [];
  if (records.length) {
    return records
      .map((record) => Number(record.totalScore))
      .filter(Number.isFinite);
  }
  if (judgeState && judgeState.records && typeof judgeState.records === "object") {
    return [];
  }

  const scores = judgeState && typeof judgeState.scores === "object" ? judgeState.scores : {};
  return Object.values(scores)
    .map((judgeScores) => getJudgeTeamAverage(judgeScores?.[teamId]))
    .filter((score) => score !== null);
}

function buildFinalResultSource({ voteState = {}, judgeState = {} } = {}) {
  const normalizedJudgeState = normalizeState(judgeState);
  const judgeRecords = {};
  Object.entries(normalizedJudgeState.records || {}).forEach(([judgeId, teamRecords]) => {
    judgeRecords[judgeId] = {};
    Object.entries(teamRecords || {}).forEach(([teamId, record]) => {
      const normalized = normalizeRecord(record);
      judgeRecords[judgeId][teamId] = {
        status: normalized.status,
        totalScore: normalized.totalScore,
        updatedAt: normalized.updatedAt || "",
      };
    });
  });

  return {
    vote: {
      status: String(voteState.status || "").trim(),
      windowLabel: String(voteState.windowLabel || "").trim(),
      updatedAt: voteState.updatedAt || "",
      pointScale: Array.isArray(voteState.pointScale) ? voteState.pointScale : [],
      results: (Array.isArray(voteState.results) ? voteState.results : []).map((team) => ({
        id: String(team?.id || "").trim(),
        name: String(team?.name || "").trim(),
        votes: Number(team?.votes || 0),
      })),
    },
    judge: {
      updatedAt: normalizedJudgeState.updatedAt || "",
      records: judgeRecords,
    },
  };
}

function assertFinalResultPublishable({ voteState = {} } = {}) {
  const voteStatus = String(voteState.status || "").trim().toLowerCase();
  if (!["closed", "published"].includes(voteStatus)) {
    throw createHttpError(409, "Final results can only be published after the vote window is closed.");
  }

  const teamIds = (Array.isArray(voteState.results) ? voteState.results : [])
    .map((team) => String(team?.id || "").trim())
    .filter(Boolean);
  if (!teamIds.length) {
    throw createHttpError(409, "Final results require at least one ranked team.");
  }
}

function buildFinalResultSnapshot({ voteState = {}, judgeState = {}, publishedBy = "admin" } = {}) {
  const pointScale = Array.isArray(voteState.pointScale) && voteState.pointScale.length
    ? voteState.pointScale
    : [100, 85, 70, 55, 40];
  const sourceResults = Array.isArray(voteState.results) ? voteState.results : [];
  const resultsWithJudgeScores = sourceResults.map((team) => {
    const judgeExpertScores = getExpertScoresForTeam(judgeState, team.id);
    return {
      ...team,
      expert: judgeExpertScores.length ? judgeExpertScores : team.expert,
    };
  });

  return {
    pointScale,
    results: computeFinalResults(resultsWithJudgeScores, pointScale),
    source: buildFinalResultSource({ voteState, judgeState }),
    publishedBy,
  };
}

module.exports = {
  assertFinalResultPublishable,
  buildFinalResultSnapshot,
  buildFinalResultSource,
};
