const { createHttpError } = require("./traineeRepository");

const ALLOWED_STATUSES = new Set(["draft", "submitted", "reviewing", "published", "rejected"]);

function normalizeId(value) {
  return String(value || "").trim();
}

function parseJsonValue(value, fallback = []) {
  if (Buffer.isBuffer(value)) {
    return JSON.parse(value.toString("utf8"));
  }
  if (typeof value === "string" && value.trim()) {
    return JSON.parse(value);
  }
  if (Array.isArray(value)) {
    return value;
  }
  return fallback;
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function toMysqlDateTime(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function splitTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[、,，/|;\n]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeWork(work = {}) {
  const teamId = normalizeId(work.teamId || work.team_id || work.id);
  const status = String(work.status || "").trim();

  return {
    id: normalizeId(work.id || teamId),
    teamId,
    teamName: String(work.teamName || work.team_name || work.name || "").trim(),
    project: String(work.project || work.title || "").trim(),
    pitch: String(work.pitch || work.description || "").trim(),
    stack: splitTags(work.stack),
    demoUrl: String(work.demoUrl || work.demo_url || "").trim(),
    codeUrl: String(work.codeUrl || work.code_url || "").trim(),
    docUrl: String(work.docUrl || work.doc_url || "").trim(),
    screenshots: splitTags(work.screenshots),
    status: ALLOWED_STATUSES.has(status) ? status : "draft",
    submittedAt: normalizeDate(work.submittedAt || work.submitted_at),
    submittedBy: String(work.submittedBy || work.submitted_by || "").trim(),
    reviewedAt: normalizeDate(work.reviewedAt || work.reviewed_at),
    reviewedBy: String(work.reviewedBy || work.reviewed_by || "").trim(),
    reviewNote: String(work.reviewNote || work.review_note || "").trim(),
    updatedAt: normalizeDate(work.updatedAt || work.updated_at) || new Date().toISOString(),
  };
}

function rowToWork(row = {}) {
  return normalizeWork({
    id: row.id,
    teamId: row.team_id || row.teamId,
    teamName: row.team_name || row.teamName,
    project: row.project,
    pitch: row.pitch,
    stack: parseJsonValue(row.stack_json || row.stackJson, []),
    demoUrl: row.demo_url || row.demoUrl,
    codeUrl: row.code_url || row.codeUrl,
    docUrl: row.doc_url || row.docUrl,
    screenshots: parseJsonValue(row.screenshots_json || row.screenshotsJson, []),
    status: row.status,
    submittedBy: row.submitted_by || row.submittedBy,
    submittedAt: row.submitted_at || row.submittedAt,
    reviewedBy: row.reviewed_by || row.reviewedBy,
    reviewedAt: row.reviewed_at || row.reviewedAt,
    reviewNote: row.review_note || row.reviewNote,
    updatedAt: row.updated_at || row.updatedAt,
  });
}

function createMysqlWorksRepository(pool) {
  if (!pool || typeof pool.execute !== "function") {
    throw new Error("A mysql2-compatible pool with execute(sql, params) is required.");
  }

  const selectColumns = `id, team_id, team_name, project, pitch, stack_json,
    demo_url, code_url, doc_url, screenshots_json, status, submitted_by,
    submitted_at, reviewed_by, reviewed_at, review_note, updated_at`;

  async function listWorks({ status } = {}) {
    const cleanStatus = normalizeId(status);
    const [rows] = cleanStatus
      ? await pool.execute(
        `SELECT ${selectColumns}
         FROM works
         WHERE status = ?
         ORDER BY updated_at DESC, id ASC`,
        [cleanStatus],
      )
      : await pool.execute(
        `SELECT ${selectColumns}
         FROM works
         ORDER BY updated_at DESC, id ASC`,
      );

    return rows.map(rowToWork);
  }

  async function getWork(teamId) {
    const cleanTeamId = normalizeId(teamId);
    const [rows] = await pool.execute(
      `SELECT ${selectColumns}
       FROM works
       WHERE id = ? OR team_id = ?
       LIMIT 1`,
      [cleanTeamId, cleanTeamId],
    );

    if (!rows.length) {
      throw createHttpError(404, `Work ${cleanTeamId} was not found.`);
    }

    return rowToWork(rows[0]);
  }

  async function submitWork(payload = {}) {
    const teamId = normalizeId(payload.teamId || payload.id);
    if (!teamId) {
      throw createHttpError(400, "teamId is required.");
    }

    const project = String(payload.project || payload.title || "").trim();
    if (!project) {
      throw createHttpError(400, "project is required.");
    }

    const updatedAt = new Date().toISOString();
    const work = normalizeWork({
      ...payload,
      id: teamId,
      teamId,
      project,
      status: "submitted",
      submittedAt: payload.submittedAt || updatedAt,
      updatedAt,
    });

    await pool.execute(
      `INSERT INTO works
        (id, team_id, team_name, project, pitch, stack_json, demo_url, code_url, doc_url,
         screenshots_json, status, submitted_by, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        team_id = VALUES(team_id),
        team_name = VALUES(team_name),
        project = VALUES(project),
        pitch = VALUES(pitch),
        stack_json = VALUES(stack_json),
        demo_url = VALUES(demo_url),
        code_url = VALUES(code_url),
        doc_url = VALUES(doc_url),
        screenshots_json = VALUES(screenshots_json),
        status = VALUES(status),
        submitted_by = VALUES(submitted_by),
        submitted_at = VALUES(submitted_at),
        reviewed_by = '',
        reviewed_at = NULL,
        review_note = '',
        updated_at = CURRENT_TIMESTAMP`,
      [
        work.id,
        work.teamId,
        work.teamName,
        work.project,
        work.pitch,
        JSON.stringify(work.stack),
        work.demoUrl,
        work.codeUrl,
        work.docUrl,
        JSON.stringify(work.screenshots),
        work.status,
        work.submittedBy,
        toMysqlDateTime(work.submittedAt),
      ],
    );

    return {
      accepted: true,
      work: await getWork(teamId),
    };
  }

  async function withdrawWork(payload = {}) {
    const cleanTeamId = normalizeId(payload.teamId || payload.id);
    if (!cleanTeamId) {
      throw createHttpError(400, "teamId is required.");
    }

    await getWork(cleanTeamId);

    const [result] = await pool.execute(
      `UPDATE works SET
        status = 'draft',
        submitted_at = NULL,
        reviewed_by = '',
        reviewed_at = NULL,
        review_note = '',
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ? OR team_id = ?`,
      [cleanTeamId, cleanTeamId],
    );

    if (result.affectedRows === 0) {
      throw createHttpError(404, `Work ${cleanTeamId} was not found.`);
    }

    return {
      accepted: true,
      work: await getWork(cleanTeamId),
    };
  }

  async function updateStatus(teamId, payload = {}) {
    const cleanTeamId = normalizeId(teamId);
    const status = normalizeId(payload.status);

    if (!cleanTeamId) {
      throw createHttpError(400, "teamId is required.");
    }
    if (!ALLOWED_STATUSES.has(status)) {
      throw createHttpError(400, `Unknown work status: ${status || "(empty)"}.`);
    }

    const existing = await getWork(cleanTeamId);
    const reviewedAt = new Date().toISOString();
    const reviewedBy = String(payload.reviewerId || payload.actor || existing.reviewedBy || "admin").trim();
    const reviewNote = String(payload.reviewNote || existing.reviewNote || "").trim();

    const [result] = await pool.execute(
      `UPDATE works SET
        status = ?,
        reviewed_by = ?,
        reviewed_at = ?,
        review_note = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ? OR team_id = ?`,
      [status, reviewedBy, toMysqlDateTime(reviewedAt), reviewNote, cleanTeamId, cleanTeamId],
    );

    if (result.affectedRows === 0) {
      throw createHttpError(404, `Work ${cleanTeamId} was not found.`);
    }

    return {
      accepted: true,
      work: await getWork(cleanTeamId),
    };
  }

  return {
    getWork,
    listWorks,
    submitWork,
    withdrawWork,
    updateStatus,
  };
}

module.exports = {
  createMysqlWorksRepository,
};
