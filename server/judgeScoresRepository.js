const fs = require("node:fs/promises");
const path = require("node:path");
const { createHttpError } = require("./traineeRepository");

const DEFAULT_DATA_PATH = path.join(__dirname, "../data/judge-scores.json");

function normalizeJudgeId(payload = {}) {
  return String(payload.judgeId || payload.userId || payload.openId || "local-judge").trim();
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

function normalizeState(payload = {}) {
  return {
    updatedAt: payload.updatedAt || new Date().toISOString(),
    scores: payload.scores && typeof payload.scores === "object" ? payload.scores : {},
  };
}

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

    const state = await readState();
    const updatedAt = new Date().toISOString();
    const nextState = normalizeState({
      ...state,
      updatedAt,
      scores: {
        ...state.scores,
        [judgeId]: {
          ...(state.scores[judgeId] || {}),
          ...scores,
        },
      },
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

  return {
    readState,
    saveScores,
  };
}

module.exports = {
  createJudgeScoresRepository,
};
