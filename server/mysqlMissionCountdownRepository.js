const { createHttpError } = require("./traineeRepository");
const { formatMysqlLocalDatetime } = require("./mysqlDatetime");

const DEFAULT_ID = "main";
const DEFAULT_DURATION_MS = 36 * 60 * 60 * 1000;
const DEFAULT_STATE = {
  startedAt: null,
  durationMs: DEFAULT_DURATION_MS,
};

function normalizeDurationMs(durationMs, defaultDurationMs = DEFAULT_DURATION_MS) {
  const cleanDurationMs = Number(durationMs);
  return Number.isFinite(cleanDurationMs) && cleanDurationMs > 0
    ? cleanDurationMs
    : defaultDurationMs;
}

function normalizeStartedAt(startedAt, label = "Mission countdown") {
  if (startedAt === null || typeof startedAt === "undefined" || startedAt === "") {
    return null;
  }

  if (startedAt instanceof Date) {
    if (!Number.isFinite(startedAt.getTime())) {
      throw createHttpError(400, `${label} startedAt must be a valid timestamp.`);
    }
    return startedAt.toISOString();
  }

  const timestamp = typeof startedAt === "number" ? startedAt : Date.parse(String(startedAt));
  if (!Number.isFinite(timestamp)) {
    throw createHttpError(400, `${label} startedAt must be a valid timestamp.`);
  }

  return new Date(timestamp).toISOString();
}

function toDateOrNull(startedAt, label) {
  const normalized = normalizeStartedAt(startedAt, label);
  return normalized ? formatMysqlLocalDatetime(normalized) : null;
}

function normalizeState(state = {}, { defaultDurationMs = DEFAULT_DURATION_MS, label } = {}) {
  return {
    startedAt: normalizeStartedAt(state.startedAt, label),
    durationMs: normalizeDurationMs(state.durationMs, defaultDurationMs),
  };
}

function withServerNow(state) {
  return {
    ...state,
    serverNow: new Date().toISOString(),
  };
}

function createMysqlMissionCountdownRepository(pool, options = {}) {
  if (!pool || typeof pool.execute !== "function") {
    throw new Error("A mysql2-compatible pool with execute(sql, params) is required.");
  }
  const id = String(options.id || DEFAULT_ID).trim() || DEFAULT_ID;
  const defaultDurationMs = Number(options.defaultDurationMs) > 0 ? Number(options.defaultDurationMs) : DEFAULT_DURATION_MS;
  const label = options.label || "Mission countdown";

  async function readState() {
    const [rows] = await pool.execute(
      "SELECT started_at, duration_ms FROM mission_countdowns WHERE id = ? LIMIT 1",
      [id],
    );
    if (!rows.length) {
      return normalizeState({ ...DEFAULT_STATE, durationMs: defaultDurationMs }, { defaultDurationMs, label });
    }

    return normalizeState({
      startedAt: rows[0].started_at || rows[0].startedAt,
      durationMs: rows[0].duration_ms || rows[0].durationMs,
    }, { defaultDurationMs, label });
  }

  async function writeState(state) {
    const nextState = normalizeState(state, { defaultDurationMs, label });
    await pool.execute(
      `INSERT INTO mission_countdowns (id, started_at, duration_ms)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
        started_at = VALUES(started_at),
        duration_ms = VALUES(duration_ms),
        updated_at = CURRENT_TIMESTAMP`,
      [
        id,
        toDateOrNull(nextState.startedAt, label),
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
      startedAt: normalizeStartedAt(payload.startedAt, label) || new Date().toISOString(),
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
