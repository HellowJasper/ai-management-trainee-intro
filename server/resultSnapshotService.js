const { computeFinalResults } = require("../src/logic");

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
  const scores = judgeState && typeof judgeState.scores === "object" ? judgeState.scores : {};
  return Object.values(scores)
    .map((judgeScores) => getJudgeTeamAverage(judgeScores?.[teamId]))
    .filter((score) => score !== null);
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
    publishedBy,
  };
}

module.exports = {
  buildFinalResultSnapshot,
};
