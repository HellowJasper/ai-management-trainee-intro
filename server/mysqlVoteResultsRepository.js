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

  async function withTransaction(operation) {
    if (typeof pool.getConnection !== "function") {
      return operation(pool);
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await operation(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  function isDuplicateActiveVoteError(error) {
    return Boolean(error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062));
  }

  async function readVoteWindow(db = pool, { forUpdate = false } = {}) {
    const [rows] = await db.execute(
      `SELECT status, window_label, point_scale_json
       FROM vote_windows
       WHERE id = ?
       LIMIT 1${forUpdate ? " FOR UPDATE" : ""}`,
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

  async function readVoteCounts(db = pool) {
    const [rows] = await db.execute(
      "SELECT team_id, COUNT(*) AS votes FROM votes WHERE status = 'active' GROUP BY team_id",
    );
    return new Map(rows.map((row) => [normalizeId(row.team_id || row.teamId), Number(row.votes || 0)]));
  }

  async function readActiveVoters(db = pool) {
    const [rows] = await db.execute(
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

  function ensureExistingVoteMatches(userId, teamId, existingTeamId) {
    if (existingTeamId && existingTeamId !== teamId) {
      throw createHttpError(409, `User ${userId} already voted for ${existingTeamId}.`);
    }
  }

  async function ensureTeamExists(teamId, db = pool) {
    const [rows] = await db.execute(
      "SELECT id FROM teams WHERE id = ? LIMIT 1",
      [teamId],
    );
    if (!rows.length) {
      throw createHttpError(404, `Vote team ${teamId} was not found.`);
    }
  }

  async function getCurrentActiveVote(userId, db = pool, { forUpdate = false } = {}) {
    const [rows] = await db.execute(
      `SELECT team_id
       FROM votes
       WHERE voter_id = ? AND status = 'active'
       LIMIT 1${forUpdate ? " FOR UPDATE" : ""}`,
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

    await withTransaction(async (db) => {
      const windowState = await readVoteWindow(db, { forUpdate: true });
      ensureVotingOpen(windowState);
      await ensureTeamExists(teamId, db);

      const currentVote = await getCurrentActiveVote(userId, db, { forUpdate: true });
      ensureExistingVoteMatches(userId, teamId, currentVote);
      if (currentVote) {
        return;
      }

      try {
        await db.execute(
          "INSERT INTO votes (voter_id, team_id, source, status) VALUES (?, ?, ?, 'active')",
          [userId, teamId, source || "web"],
        );
      } catch (error) {
        if (!isDuplicateActiveVoteError(error)) {
          throw error;
        }

        const racedVote = await getCurrentActiveVote(userId, db, { forUpdate: true });
        ensureExistingVoteMatches(userId, teamId, racedVote);
      }
    });

    return {
      accepted: true,
      teamId,
      userId,
      ...await listVoteResults(),
    };
  }

  async function cancelVote(payload = {}) {
    const userId = normalizeUserId(payload);
    const result = await withTransaction(async (db) => {
      const windowState = await readVoteWindow(db, { forUpdate: true });
      ensureVotingOpen(windowState);
      const currentVote = await getCurrentActiveVote(userId, db, { forUpdate: true });
      const teamId = normalizeId(payload.teamId || currentVote);

      if (!teamId) {
        throw createHttpError(400, "teamId is required.");
      }
      if (!currentVote) {
        return {
          accepted: false,
          teamId,
          userId,
        };
      }
      if (currentVote !== teamId) {
        throw createHttpError(409, `User ${userId} voted for ${currentVote}, not ${teamId}.`);
      }

      await db.execute(
        `UPDATE votes
         SET status = CONCAT('cancelled-', id), updated_at = CURRENT_TIMESTAMP
         WHERE voter_id = ? AND team_id = ? AND status = 'active'`,
        [userId, teamId],
      );

      return {
        accepted: true,
        teamId,
        userId,
      };
    });

    return {
      ...result,
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
