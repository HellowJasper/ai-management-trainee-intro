const fs = require("node:fs/promises");
const path = require("node:path");
const { createHttpError } = require("./traineeRepository");

const DEFAULT_DATA_PATH = path.join(__dirname, "../data/mission-countdown.json");
const DEFAULT_DURATION_MS = 24 * 60 * 60 * 1000;

const DEFAULT_STATE = {
  startedAt: null,
  durationMs: DEFAULT_DURATION_MS,
};

function normalizeDurationMs(durationMs) {
  const cleanDurationMs = Number(durationMs);
  return Number.isFinite(cleanDurationMs) && cleanDurationMs > 0
    ? cleanDurationMs
    : DEFAULT_DURATION_MS;
}

function normalizeStartedAt(startedAt) {
  if (startedAt === null || typeof startedAt === "undefined" || startedAt === "") {
    return null;
  }

  const timestamp = typeof startedAt === "number" ? startedAt : Date.parse(String(startedAt));
  if (!Number.isFinite(timestamp)) {
    throw createHttpError(400, "Mission countdown startedAt must be a valid timestamp.");
  }

  return new Date(timestamp).toISOString();
}

function normalizeState(state = {}) {
  return {
    startedAt: normalizeStartedAt(state.startedAt),
    durationMs: normalizeDurationMs(state.durationMs),
  };
}

function withServerNow(state) {
  return {
    ...state,
    serverNow: new Date().toISOString(),
  };
}

function createMissionCountdownRepository(dataPath = DEFAULT_DATA_PATH) {
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

      const state = normalizeState(DEFAULT_STATE);
      await writeState(state);
      return state;
    }
  }

  async function getState() {
    return withServerNow(await readState());
  }

  async function startCountdown(payload = {}) {
    const state = await readState();

    if (state.startedAt) {
      return withServerNow(state);
    }

    const nextState = normalizeState({
      ...state,
      startedAt: normalizeStartedAt(payload.startedAt) || new Date().toISOString(),
      durationMs: payload.durationMs || state.durationMs,
    });

    await writeState(nextState);
    return withServerNow(nextState);
  }

  return {
    getState,
    startCountdown,
  };
}

module.exports = {
  DEFAULT_MISSION_COUNTDOWN_DURATION_MS: DEFAULT_DURATION_MS,
  createMissionCountdownRepository,
};
