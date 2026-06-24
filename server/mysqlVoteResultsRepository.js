const { createHttpError } = require("./traineeRepository");

const DEFAULT_POINT_SCALE = [100, 85, 70, 55, 40];
const DEFAULT_WINDOW_ID = "main";
const VOTE_WINDOW_LABELS = {
  voting: "投票窗口开启中",
  closed: "投票已关闭",
  published: "结果已发布",
};

function normalizeUserId(payload = {}) {
  return String(payload.userId || payload.openId || payload.unionId || "local-public").trim();
}

function normalizeId(value) {
  return String(value || "").trim();
}

function parseJsonValue(value, fallback = {}) {
  if (Buffer.isBuffer(value)) {
    return JSON.parse(value.toString("utf8"));
  }
  if (typeof value === "string" && value.trim()) {
    return JSON.parse(value);
  }
  if (value && typeof value === "object") {
    return value;
  }
  return fallback;
}

function normalizeVoteWindowStatus(status) {
  const cleanStatus = String(status || "").trim();
  if (!Object.prototype.hasOwnProperty.call(VOTE_WINDOW_LABELS, cleanStatus)) {
    throw createHttpError(400, "status must be one of: voting, closed, published.");
  }
  return cleanStatus;
}

function defaultVoteWindow() {
  return {
    pointScale: DEFAULT_POINT_SCALE,
    status: "voting",
    windowLabel: VOTE_WINDOW_LABELS.voting,
    updatedAt: new Date().toISOString(),
  };
}

function rowToResult(row = {}, votesByTeam = new Map()) {
  const meta = parseJsonValue(row.meta_json || row.metaJson || row.meta, {});
  const id = normalizeId(row.id || meta.id);
  return {
    id,
    name: String(row.name || meta.name || "").trim(),
    track: String(meta.track || meta.nameEn || row.track_name || row.trackName || "").trim(),
    project: String(row.project || meta.project || "").trim(),
    color: String(meta.color || "").trim(),
    colorRgb: String(meta.colorRgb || meta.color_rgb || "").trim(),
    votes: Number(votesByTeam.get(id) || 0),
    expert: Number(meta.expert || 0),
  };
}

function createMysqlVoteResultsRepository(pool) {
  if (!pool || typeof pool.execute !== "function") {
    throw new Error("A mysql2-compatible pool with execute(sql, params) is required.");
  }

  async function readVoteWindow() {
    const [rows] = await pool.execute(
      "SELECT status, window_label, point_scale_json FROM vote_windows WHERE id = ? LIMIT 1",
      [DEFAULT_WINDOW_ID],
    );
    if (!rows.length) {
      return defaultVoteWindow();
    }

    const row = rows[0];
    const status = String(row.status || "voting").trim();
    return {
      pointScale: parseJsonValue(row.point_scale_json || row.pointScaleJson, DEFAULT_POINT_SCALE),
      status,
      windowLabel: row.window_label || row.windowLabel || VOTE_WINDOW_LABELS[status] || VOTE_WINDOW_LABELS.voting,
      updatedAt: new Date().toISOString(),
    };
  }

  async function readVoteCounts() {
    const [rows] = await pool.execute(
      "SELECT team_id, COUNT(*) AS votes FROM votes WHERE status = 'active' GROUP BY team_id",
    );
    return new Map(rows.map((row) => [normalizeId(row.team_id || row.teamId), Number(row.votes || 0)]));
  }

  async function readActiveVoters() {
    const [rows] = await pool.execute(
      "SELECT voter_id, team_id FROM votes WHERE status = 'active'",
    );
    return rows.reduce((voters, row) => {
      voters[normalizeId(row.voter_id || row.voterId)] = normalizeId(row.team_id || row.teamId);
      return voters;
    }, {});
  }

  async function listVoteResults() {
    const [windowState, votesByTeam, voters, [teamRows]] = await Promise.all([
      readVoteWindow(),
      readVoteCounts(),
      readActiveVoters(),
      pool.execute(
        `SELECT id, name, track_name, project, sort_order, meta_json
         FROM teams
         ORDER BY sort_order ASC, id ASC`,
      ),
    ]);

    return {
      ...windowState,
      results: teamRows.map((row) => rowToResult(row, votesByTeam)),
      voters,
    };
  }

  function ensureVotingOpen(state) {
    if (state.status && state.status !== "voting") {
      throw createHttpError(409, "Vote window is not open.");
    }
  }

  async function ensureTeamExists(teamId) {
    const [rows] = await pool.execute(
      "SELECT id FROM teams WHERE id = ? LIMIT 1",
      [teamId],
    );
    if (!rows.length) {
      throw createHttpError(404, `Vote team ${teamId} was not found.`);
    }
  }

  async function getCurrentActiveVote(userId) {
    const [rows] = await pool.execute(
      "SELECT team_id FROM votes WHERE voter_id = ? AND status = 'active' LIMIT 1",
      [userId],
    );
    return rows[0] ? normalizeId(rows[0].team_id || rows[0].teamId) : "";
  }

  async function castVote(payload = {}) {
    const teamId = normalizeId(payload.teamId);
    const userId = normalizeUserId(payload);
    const source = String(payload.source || "web").trim();
    if (!teamId) {
      throw createHttpError(400, "teamId is required.");
    }

    const state = await listVoteResults();
    ensureVotingOpen(state);
    await ensureTeamExists(teamId);

    const currentVote = await getCurrentActiveVote(userId);
    if (currentVote && currentVote !== teamId) {
      throw createHttpError(409, `User ${userId} already voted for ${currentVote}.`);
    }

    if (!currentVote) {
      await pool.execute(
        "INSERT INTO votes (voter_id, team_id, source, status) VALUES (?, ?, ?, 'active')",
        [userId, teamId, source],
      );
    }

    return {
      accepted: true,
      teamId,
      userId,
      ...await listVoteResults(),
    };
  }

  async function cancelVote(payload = {}) {
    const userId = normalizeUserId(payload);
    const state = await listVoteResults();
    ensureVotingOpen(state);
    const currentVote = await getCurrentActiveVote(userId);
    const teamId = normalizeId(payload.teamId || currentVote);

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

    await pool.execute(
      "UPDATE votes SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE voter_id = ? AND team_id = ? AND status = 'active'",
      [userId, teamId],
    );

    return {
      accepted: true,
      teamId,
      userId,
      ...await listVoteResults(),
    };
  }

  async function updateWindowStatus(payload = {}) {
    const status = normalizeVoteWindowStatus(payload.status);
    const pointScale = Array.isArray(payload.pointScale) && payload.pointScale.length
      ? payload.pointScale
      : DEFAULT_POINT_SCALE;
    const windowLabel = payload.windowLabel || VOTE_WINDOW_LABELS[status];

    await pool.execute(
      `INSERT INTO vote_windows (id, status, window_label, point_scale_json)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        window_label = VALUES(window_label),
        point_scale_json = VALUES(point_scale_json),
        updated_at = CURRENT_TIMESTAMP`,
      [DEFAULT_WINDOW_ID, status, windowLabel, JSON.stringify(pointScale)],
    );

    return {
      accepted: true,
      ...await listVoteResults(),
    };
  }

  return {
    cancelVote,
    castVote,
    listVoteResults,
    updateWindowStatus,
  };
}

module.exports = {
  createMysqlVoteResultsRepository,
};
