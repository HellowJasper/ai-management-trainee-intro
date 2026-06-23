const fs = require("node:fs/promises");
const path = require("node:path");
const { createHttpError } = require("./traineeRepository");

const DEFAULT_DATA_PATH = path.join(__dirname, "../data/roadshow.json");
const DEFAULT_DURATION_MS = 15 * 60 * 1000;

const DEFAULT_STATE = {
  currentTeamId: "marketing",
  currentTeam: {
    id: "marketing",
    index: "03",
    name: "营销",
    nameEn: "SALES & MARKETING",
    hostDepartment: "健康品事业部",
    project: "全域内容生成引擎",
    color: "rgb(100, 232, 214)",
    colorRgb: "100, 232, 214",
  },
  nextTeamId: "functions",
  nextTeam: {
    id: "functions",
    index: "04",
    name: "职能",
    nameEn: "GENERAL FUNCTIONS",
    hostDepartment: "董事长办公室",
    project: "职能流程自动化助手",
    color: "var(--neon-2)",
    colorRgb: "167, 255, 79",
  },
  phase: "DEMO",
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
    throw createHttpError(400, "Roadshow startedAt must be a valid timestamp.");
  }

  return new Date(timestamp).toISOString();
}

function normalizeState(state = {}) {
  return {
    currentTeamId: state.currentTeamId || state.teamId || DEFAULT_STATE.currentTeamId,
    currentTeam: state.currentTeam || state.team || DEFAULT_STATE.currentTeam,
    nextTeamId: state.nextTeamId || DEFAULT_STATE.nextTeamId,
    nextTeam: state.nextTeam || DEFAULT_STATE.nextTeam,
    phase: state.phase || DEFAULT_STATE.phase,
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

function createRoadshowRepository(dataPath = DEFAULT_DATA_PATH) {
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

  async function startRoadshow(payload = {}) {
    const state = await readState();

    if (state.startedAt) {
      return withServerNow(state);
    }

    const nextState = normalizeState({
      ...state,
      currentTeamId: payload.currentTeamId || state.currentTeamId,
      nextTeamId: payload.nextTeamId || state.nextTeamId,
      startedAt: normalizeStartedAt(payload.startedAt) || new Date().toISOString(),
      durationMs: payload.durationMs || state.durationMs,
    });

    await writeState(nextState);
    return withServerNow(nextState);
  }

  async function updateState(payload = {}) {
    const state = await readState();
    const nextState = normalizeState({
      ...state,
      ...payload,
      startedAt: Object.hasOwn(payload, "startedAt") ? payload.startedAt : state.startedAt,
      durationMs: Object.hasOwn(payload, "durationMs") ? payload.durationMs : state.durationMs,
    });

    await writeState(nextState);
    return withServerNow(nextState);
  }

  return {
    getState,
    startRoadshow,
    updateState,
  };
}

module.exports = {
  DEFAULT_ROADSHOW_DURATION_MS: DEFAULT_DURATION_MS,
  createRoadshowRepository,
};
