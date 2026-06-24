const { createHttpError } = require("./traineeRepository");

const DEFAULT_ID = "main";
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

  if (startedAt instanceof Date) {
    if (!Number.isFinite(startedAt.getTime())) {
      throw createHttpError(400, "Roadshow startedAt must be a valid timestamp.");
    }
    return startedAt.toISOString();
  }

  const timestamp = typeof startedAt === "number" ? startedAt : Date.parse(String(startedAt));
  if (!Number.isFinite(timestamp)) {
    throw createHttpError(400, "Roadshow startedAt must be a valid timestamp.");
  }

  return new Date(timestamp).toISOString();
}

function toDateOrNull(startedAt) {
  const normalized = normalizeStartedAt(startedAt);
  return normalized ? new Date(normalized) : null;
}

function parseJsonValue(value) {
  if (Buffer.isBuffer(value)) {
    return JSON.parse(value.toString("utf8"));
  }
  if (typeof value === "string" && value.trim()) {
    return JSON.parse(value);
  }
  if (value && typeof value === "object") {
    return value;
  }
  return {};
}

function rowToTeam(row = {}) {
  const meta = parseJsonValue(row.meta_json || row.metaJson);
  return {
    ...meta,
    id: String(row.id || meta.id || "").trim(),
    name: String(row.name || meta.name || "").trim(),
    nameEn: String(meta.nameEn || row.track_name || row.trackName || "").trim(),
    project: String(row.project || meta.project || "").trim(),
  };
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

function createMysqlRoadshowRepository(pool) {
  if (!pool || typeof pool.execute !== "function") {
    throw new Error("A mysql2-compatible pool with execute(sql, params) is required.");
  }

  async function readRawState() {
    const [rows] = await pool.execute(
      `SELECT current_team_id, next_team_id, phase, started_at, duration_ms
       FROM roadshow_sessions
       WHERE id = ?
       LIMIT 1`,
      [DEFAULT_ID],
    );
    if (!rows.length) {
      return normalizeState(DEFAULT_STATE);
    }

    return normalizeState({
      currentTeamId: rows[0].current_team_id || rows[0].currentTeamId,
      nextTeamId: rows[0].next_team_id || rows[0].nextTeamId,
      phase: rows[0].phase,
      startedAt: rows[0].started_at || rows[0].startedAt,
      durationMs: rows[0].duration_ms || rows[0].durationMs,
    });
  }

  async function hydrateTeams(state) {
    const ids = [...new Set([state.currentTeamId, state.nextTeamId].filter(Boolean))];
    if (!ids.length) {
      return normalizeState(state);
    }

    const placeholders = ids.map(() => "?").join(", ");
    const [rows] = await pool.execute(
      `SELECT id, name, track_name, project, meta_json
       FROM teams
       WHERE id IN (${placeholders})`,
      ids,
    );
    const teams = new Map(rows.map((row) => {
      const team = rowToTeam(row);
      return [team.id, team];
    }));

    return normalizeState({
      ...state,
      currentTeam: teams.get(state.currentTeamId) || state.currentTeam || DEFAULT_STATE.currentTeam,
      nextTeam: teams.get(state.nextTeamId) || state.nextTeam || DEFAULT_STATE.nextTeam,
    });
  }

  async function readState() {
    return hydrateTeams(await readRawState());
  }

  async function writeState(state) {
    const nextState = normalizeState(state);
    await pool.execute(
      `INSERT INTO roadshow_sessions (id, current_team_id, next_team_id, phase, started_at, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        current_team_id = VALUES(current_team_id),
        next_team_id = VALUES(next_team_id),
        phase = VALUES(phase),
        started_at = VALUES(started_at),
        duration_ms = VALUES(duration_ms),
        updated_at = CURRENT_TIMESTAMP`,
      [
        DEFAULT_ID,
        nextState.currentTeamId,
        nextState.nextTeamId,
        nextState.phase,
        toDateOrNull(nextState.startedAt),
        nextState.durationMs,
      ],
    );

    return hydrateTeams(nextState);
  }

  async function getState() {
    return withServerNow(await readState());
  }

  async function startRoadshow(payload = {}) {
    const state = await readState();
    if (state.startedAt) {
      return withServerNow(state);
    }

    const nextState = await writeState({
      ...state,
      currentTeamId: payload.currentTeamId || state.currentTeamId,
      nextTeamId: payload.nextTeamId || state.nextTeamId,
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
    startRoadshow,
    updateState,
  };
}

module.exports = {
  createMysqlRoadshowRepository,
};
