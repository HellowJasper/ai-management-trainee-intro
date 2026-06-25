const fs = require("node:fs/promises");
const path = require("node:path");
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

const DEFAULT_DATA_PATH = path.join(__dirname, "../data/judge-scores.json");

function createJudgeScoresRepository(dataPath = DEFAULT_DATA_PATH) {
  const resolvedDataPath = path.resolve(dataPath);

  async function writeState(state) {
    await fs.mkdir(path.dirname(resolvedDataPath), { recursive: true });
    await fs.writeFile(resolvedDataPath, `${JSON.stringify(normalizeState(state), null, 2)}\n`);
  }

  async function readState() {
    try {
      const raw = await fs.readFile(resolvedDataPath, "utf8");
      return normalizeState(JSON.parse(raw));
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }

      const state = normalizeState();
      await writeState(state);
      return state;
    }
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

    const state = await readState();
    const updatedAt = new Date().toISOString();
    const records = {
      ...(state.records || {}),
      [judgeId]: {
        ...((state.records || {})[judgeId] || {}),
      },
    };

    receivedTeamIds.forEach((teamId) => {
      const existing = normalizeRecord(records[judgeId][teamId] || {});
      if ([JUDGE_SCORE_STATUSES.SUBMITTED, JUDGE_SCORE_STATUSES.LOCKED].includes(existing.status)) {
        throw createHttpError(409, `Score for team ${teamId} has already been submitted.`);
      }
      const nextScores = scores[teamId];
      records[judgeId][teamId] = normalizeRecord({
        status: JUDGE_SCORE_STATUSES.DRAFT,
        scores: nextScores,
        totalScore: calculateTotalScore(nextScores),
        comment: Object.prototype.hasOwnProperty.call(comments, teamId) ? comments[teamId] : existing.comment,
        updatedAt,
      });
    });

    const nextState = normalizeState({
      ...state,
      updatedAt,
      records,
    });

    await writeState(nextState);
    return {
      accepted: true,
      judgeId,
      receivedTeamIds,
      updatedAt,
      scores: nextState.scores[judgeId],
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

    const updatedAt = new Date().toISOString();
    const records = {
      ...(state.records || {}),
      [judgeId]: {
        ...currentRecords,
      },
    };

    teamIds.forEach((teamId) => {
      const existing = normalizeRecord(records[judgeId][teamId] || {});
      if (existing.status === JUDGE_SCORE_STATUSES.LOCKED) {
        throw createHttpError(423, `Score for team ${teamId} is locked.`);
      }
      if (existing.status === JUDGE_SCORE_STATUSES.SUBMITTED) {
        throw createHttpError(409, `Score for team ${teamId} has already been submitted.`);
      }
      const nextScores = incomingScores[teamId] || existing.scores || {};
      assertCompleteScores(nextScores, teamId);
      records[judgeId][teamId] = normalizeRecord({
        status: JUDGE_SCORE_STATUSES.SUBMITTED,
        scores: nextScores,
        totalScore: calculateTotalScore(nextScores),
        comment: Object.prototype.hasOwnProperty.call(incomingComments, teamId) ? incomingComments[teamId] : existing.comment,
        submittedAt: existing.submittedAt || updatedAt,
        updatedAt,
      });
    });

    const nextState = normalizeState({ ...state, updatedAt, records });
    await writeState(nextState);
    return {
      accepted: true,
      judgeId,
      submittedTeamIds: teamIds,
      status: JUDGE_SCORE_STATUSES.SUBMITTED,
      updatedAt,
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

    const updatedAt = new Date().toISOString();
    const records = { ...(state.records || {}) };
    progress.judges.forEach((judge) => {
      records[judge.judgeId] = { ...(records[judge.judgeId] || {}) };
      progress.teams.forEach((team) => {
        const existing = normalizeRecord(records[judge.judgeId][team.teamId] || {});
        records[judge.judgeId][team.teamId] = normalizeRecord({
          ...existing,
          status: JUDGE_SCORE_STATUSES.LOCKED,
          updatedAt,
        });
      });
    });

    const nextState = normalizeState({ ...state, updatedAt, records });
    await writeState(nextState);
    return {
      accepted: true,
      status: JUDGE_SCORE_STATUSES.LOCKED,
      updatedAt,
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
  createJudgeScoresRepository,
};
