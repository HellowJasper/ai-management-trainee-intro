const { computeFinalResults } = require("../src/logic");
const { createHttpError } = require("./traineeRepository");
const {
  buildJudgeProgress,
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

function filterVoteStateByTeamIds(voteState = {}, teamIds = []) {
  const scopedTeamIds = new Set((Array.isArray(teamIds) ? teamIds : [])
    .map((teamId) => String(teamId || "").trim())
    .filter(Boolean));
  if (!scopedTeamIds.size) {
    return {
      ...voteState,
      results: [],
    };
  }

  return {
    ...voteState,
    results: (Array.isArray(voteState.results) ? voteState.results : [])
      .filter((team) => scopedTeamIds.has(String(team?.id || "").trim())),
  };
}

function filterJudgeStateByTeamIds(judgeState = {}, teamIds = []) {
  const scopedTeamIds = new Set((Array.isArray(teamIds) ? teamIds : [])
    .map((teamId) => String(teamId || "").trim())
    .filter(Boolean));
  const normalizedJudgeState = normalizeState(judgeState);
  const records = {};

  Object.entries(normalizedJudgeState.records || {}).forEach(([judgeId, teamRecords]) => {
    const scopedRecords = {};
    Object.entries(teamRecords || {}).forEach(([teamId, record]) => {
      if (scopedTeamIds.has(String(teamId || "").trim())) {
        scopedRecords[teamId] = record;
      }
    });
    if (Object.keys(scopedRecords).length) {
      records[judgeId] = scopedRecords;
    }
  });

  return {
    ...judgeState,
    records,
  };
}

function assertFinalResultPublishable({ voteState = {}, judgeState = {}, teamIds = [] } = {}) {
  const voteStatus = String(voteState.status || "").trim().toLowerCase();
  if (!["closed", "published"].includes(voteStatus)) {
    throw createHttpError(409, "Final results can only be published after the vote window is closed.");
  }

  const publishedTeamIds = Array.from(new Set((Array.isArray(teamIds) ? teamIds : [])
    .map((teamId) => String(teamId || "").trim())
    .filter(Boolean)));
  const scopedVoteState = filterVoteStateByTeamIds(voteState, teamIds);
  const rankedTeamIds = (Array.isArray(scopedVoteState.results) ? scopedVoteState.results : [])
    .map((team) => String(team?.id || "").trim())
    .filter(Boolean);
  if (!rankedTeamIds.length) {
    throw createHttpError(409, "Final results require at least one published ranked team.");
  }
  const rankedTeamIdSet = new Set(rankedTeamIds);
  const missingVoteRows = publishedTeamIds.filter((teamId) => !rankedTeamIdSet.has(teamId));
  if (missingVoteRows.length) {
    throw createHttpError(409, `Final results require vote result rows for all published works: ${missingVoteRows.join(", ")}.`);
  }

  const progress = buildJudgeProgress({
    state: judgeState,
    teamIds: publishedTeamIds,
    judges: Array.isArray(judgeState.judges) ? judgeState.judges : [],
  });
  if (!progress.scoreReady) {
    const missingTeamIds = Array.isArray(progress.missingScoreTeamIds) && progress.missingScoreTeamIds.length
      ? progress.missingScoreTeamIds.join(", ")
      : "unknown";
    throw createHttpError(409, `Final results require at least one submitted judge score for every published work: ${missingTeamIds}.`);
  }
}

function buildFinalResultSnapshot({ voteState = {}, judgeState = {}, teamIds = [], publishedBy = "admin" } = {}) {
  const pointScale = Array.isArray(voteState.pointScale) && voteState.pointScale.length
    ? voteState.pointScale
    : [100, 85, 70, 55, 40];
  const scopedVoteState = filterVoteStateByTeamIds(voteState, teamIds);
  const scopedJudgeState = filterJudgeStateByTeamIds(judgeState, teamIds);
  const sourceResults = Array.isArray(scopedVoteState.results) ? scopedVoteState.results : [];
  const resultsWithJudgeScores = sourceResults.map((team) => {
    const judgeExpertScores = getExpertScoresForTeam(scopedJudgeState, team.id);
    return {
      ...team,
      expert: judgeExpertScores.length ? judgeExpertScores : team.expert,
    };
  });

  return {
    pointScale,
    results: computeFinalResults(resultsWithJudgeScores, pointScale),
    source: buildFinalResultSource({ voteState: scopedVoteState, judgeState: scopedJudgeState }),
    publishedBy,
  };
}

module.exports = {
  assertFinalResultPublishable,
  buildFinalResultSnapshot,
  buildFinalResultSource,
};
