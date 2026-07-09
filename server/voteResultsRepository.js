const fs = require("node:fs/promises");
const path = require("node:path");
const { createHttpError } = require("./traineeRepository");

const DEFAULT_DATA_PATH = path.join(__dirname, "../data/vote-results.json");
const DEFAULT_POINT_SCALE = [100, 85, 70, 55, 40];
const VOTE_WINDOW_LABELS = {
  voting: "投票窗口开启中",
  closed: "投票已关闭",
  published: "结果已发布",
};

function normalizeUserId(payload = {}) {
  return String(payload.userId || payload.openId || payload.unionId || "local-public").trim();
}

function isRepeatableVote(payload = {}) {
  return Boolean(payload.repeatable);
}

function normalizeVoteWindowStatus(status) {
  const cleanStatus = String(status || "").trim();
  if (!Object.prototype.hasOwnProperty.call(VOTE_WINDOW_LABELS, cleanStatus)) {
    throw createHttpError(400, "status must be one of: voting, closed, published.");
  }

  return cleanStatus;
}

function resolveVoteWindowLabel(status) {
  return VOTE_WINDOW_LABELS[status] || VOTE_WINDOW_LABELS.voting;
}

function normalizeVoteResults(payload = {}) {
  const source = Array.isArray(payload)
    ? { results: payload }
    : payload;
  const status = source.status || "voting";

  return {
    pointScale: Array.isArray(source.pointScale) && source.pointScale.length
      ? source.pointScale
      : DEFAULT_POINT_SCALE,
    status,
    windowLabel: resolveVoteWindowLabel(status),
    updatedAt: source.updatedAt || new Date().toISOString(),
    results: Array.isArray(source.results) ? source.results : [],
    voters: source.voters && typeof source.voters === "object" ? source.voters : {},
  };
}

function createVoteResultsRepository(dataPath = DEFAULT_DATA_PATH) {
  const resolvedDataPath = path.resolve(dataPath);
  let writeQueue = Promise.resolve();

  async function readVoteResults() {
    const raw = await fs.readFile(resolvedDataPath, "utf8");
    return normalizeVoteResults(JSON.parse(raw));
  }

  async function writeVoteResults(payload) {
    await fs.writeFile(resolvedDataPath, `${JSON.stringify(normalizeVoteResults(payload), null, 2)}\n`);
  }

  function withSerializedWrite(operation) {
    const nextOperation = writeQueue.then(operation);
    writeQueue = nextOperation.catch(() => {});
    return nextOperation;
  }

  async function listVoteResults() {
    return writeQueue.then(() => readVoteResults());
  }

  function ensureVotingOpen(state) {
    if (state.status && state.status !== "voting") {
      throw createHttpError(409, "Vote window is not open.");
    }
  }

  function findResultIndex(state, teamId) {
    const index = state.results.findIndex((team) => team.id === teamId);
    if (index === -1) {
      throw createHttpError(404, `Vote team ${teamId} was not found.`);
    }
    return index;
  }

  async function castVote(payload = {}) {
    return withSerializedWrite(async () => {
      const teamId = String(payload.teamId || "").trim();
      const userId = normalizeUserId(payload);
      if (!teamId) {
        throw createHttpError(400, "teamId is required.");
      }

      const state = await readVoteResults();
      ensureVotingOpen(state);
      const resultIndex = findResultIndex(state, teamId);
      const repeatable = isRepeatableVote(payload);

      if (repeatable) {
        state.results[resultIndex] = {
          ...state.results[resultIndex],
          votes: Math.max(0, Number(state.results[resultIndex].votes) || 0) + 1,
        };
        state.updatedAt = new Date().toISOString();
        await writeVoteResults(state);

        return {
          accepted: true,
          repeatable: true,
          teamId,
          userId,
          ...normalizeVoteResults(state),
        };
      }

      const currentVote = state.voters[userId];

      if (currentVote && currentVote !== teamId) {
        throw createHttpError(409, `User ${userId} already voted for ${currentVote}.`);
      }

      if (!currentVote) {
        state.results[resultIndex] = {
          ...state.results[resultIndex],
          votes: Math.max(0, Number(state.results[resultIndex].votes) || 0) + 1,
        };
        state.voters[userId] = teamId;
        state.updatedAt = new Date().toISOString();
        await writeVoteResults(state);
      }

      return {
        accepted: true,
        teamId,
        userId,
        ...normalizeVoteResults(state),
      };
    });
  }

  async function cancelVote(payload = {}) {
    return withSerializedWrite(async () => {
      const userId = normalizeUserId(payload);
      const state = await readVoteResults();
      ensureVotingOpen(state);
      const currentVote = state.voters[userId];
      const teamId = String(payload.teamId || currentVote || "").trim();

      if (!teamId) {
        throw createHttpError(400, "teamId is required.");
      }
      if (!currentVote) {
        return {
          accepted: false,
          teamId,
          userId,
          ...state,
        };
      }
      if (currentVote !== teamId) {
        throw createHttpError(409, `User ${userId} voted for ${currentVote}, not ${teamId}.`);
      }

      const resultIndex = findResultIndex(state, teamId);
      state.results[resultIndex] = {
        ...state.results[resultIndex],
        votes: Math.max(0, (Number(state.results[resultIndex].votes) || 0) - 1),
      };
      delete state.voters[userId];
      state.updatedAt = new Date().toISOString();
      await writeVoteResults(state);

      return {
        accepted: true,
        teamId,
        userId,
        ...normalizeVoteResults(state),
      };
    });
  }

  async function updateWindowStatus(payload = {}) {
    return withSerializedWrite(async () => {
      const state = await readVoteResults();
      const status = normalizeVoteWindowStatus(payload.status);
      const nextState = {
        ...state,
        status,
        windowLabel: resolveVoteWindowLabel(status),
        updatedAt: new Date().toISOString(),
      };

      await writeVoteResults(nextState);

      return {
        accepted: true,
        ...normalizeVoteResults(nextState),
      };
    });
  }

  return {
    cancelVote,
    castVote,
    listVoteResults,
    updateWindowStatus,
  };
}

module.exports = {
  DEFAULT_VOTE_POINT_SCALE: DEFAULT_POINT_SCALE,
  createVoteResultsRepository,
};
