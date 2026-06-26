const { createHttpError } = require("./traineeRepository");

const DEFAULT_ID = "main";
const DEFAULT_DURATION_MS = 36 * 60 * 60 * 1000;
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

  if (startedAt instanceof Date) {
    if (!Number.isFinite(startedAt.getTime())) {
      throw createHttpError(400, "Mission countdown startedAt must be a valid timestamp.");
    }
    return startedAt.toISOString();
  }

  const timestamp = typeof startedAt === "number" ? startedAt : Date.parse(String(startedAt));
  if (!Number.isFinite(timestamp)) {
    throw createHttpError(400, "Mission countdown startedAt must be a valid timestamp.");
  }

  return new Date(timestamp).toISOString();
}

function toDateOrNull(startedAt) {
  const normalized = normalizeStartedAt(startedAt);
  return normalized ? new Date(normalized) : null;
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

function createMysqlMissionCountdownRepository(pool) {
  if (!pool || typeof pool.execute !== "function") {
    throw new Error("A mysql2-compatible pool with execute(sql, params) is required.");
  }

  async function readState() {
    const [rows] = await pool.execute(
      "SELECT started_at, duration_ms FROM mission_countdowns WHERE id = ? LIMIT 1",
      [DEFAULT_ID],
    );
    if (!rows.length) {
      return normalizeState(DEFAULT_STATE);
    }

    return normalizeState({
      startedAt: rows[0].started_at || rows[0].startedAt,
      durationMs: rows[0].duration_ms || rows[0].durationMs,
    });
  }

  async function writeState(state) {
    const nextState = normalizeState(state);
    await pool.execute(
      `INSERT INTO mission_countdowns (id, started_at, duration_ms)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
        started_at = VALUES(started_at),
        duration_ms = VALUES(duration_ms),
        updated_at = CURRENT_TIMESTAMP`,
      [
        DEFAULT_ID,
        toDateOrNull(nextState.startedAt),
        nextState.durationMs,
      ],
    );
    return nextState;
  }

  async function getState() {
    return withServerNow(await readState());
  }

  async function startCountdown(payload = {}) {
    const state = await readState();
    if (state.startedAt) {
      return withServerNow(state);
    }

    const nextState = await writeState({
      ...state,
      startedAt: normalizeStartedAt(payload.startedAt) || new Date().toISOString(),
      durationMs: payload.durationMs || state.durationMs,
    });

    return withServerNow(nextState);
  }

  async function updateState(payload = {}) {
    const state = await readState();
    const nextState = await writeState({
      ...state,
      ...payload,
      startedAt: Object.hasOwn(payload, "startedAt") ? payload.startedAt : state.startedAt,
      durationMs: Object.hasOwn(payload, "durationMs") ? payload.durationMs : state.durationMs,
    });

    return withServerNow(nextState);
  }

  return {
    getState,
    startCountdown,
    updateState,
  };
}

module.exports = {
  createMysqlMissionCountdownRepository,
};
