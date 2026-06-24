const { createHttpError } = require("./traineeRepository");

const DEFAULT_POINT_SCALE = [100, 85, 70, 55, 40];

function parseJsonValue(value, fallback) {
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

function normalizeDate(value) {
  if (!value) {
    return new Date().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function normalizeSnapshot(snapshot = {}) {
  return {
    id: String(snapshot.id || ""),
    status: String(snapshot.status || "published").trim() || "published",
    pointScale: Array.isArray(snapshot.pointScale) && snapshot.pointScale.length
      ? snapshot.pointScale
      : DEFAULT_POINT_SCALE,
    results: Array.isArray(snapshot.results) ? snapshot.results : [],
    publishedBy: String(snapshot.publishedBy || snapshot.published_by || "admin").trim() || "admin",
    publishedAt: normalizeDate(snapshot.publishedAt || snapshot.published_at),
  };
}

function rowToSnapshot(row = {}) {
  return normalizeSnapshot({
    id: row.id,
    status: row.status,
    pointScale: parseJsonValue(row.point_scale_json || row.pointScaleJson, DEFAULT_POINT_SCALE),
    results: parseJsonValue(row.result_json || row.resultJson, []),
    publishedBy: row.published_by || row.publishedBy,
    publishedAt: row.published_at || row.publishedAt,
  });
}

function createMysqlResultSnapshotsRepository(pool) {
  if (!pool || typeof pool.execute !== "function") {
    throw new Error("A mysql2-compatible pool with execute(sql, params) is required.");
  }

  async function getLatestSnapshot({ status = "published" } = {}) {
    const [rows] = await pool.execute(
      `SELECT id, status, point_scale_json, result_json, published_by, published_at
       FROM result_snapshots
       WHERE status = ?
       ORDER BY published_at DESC, id DESC
       LIMIT 1`,
      [String(status || "published").trim() || "published"],
    );
    return rows[0] ? rowToSnapshot(rows[0]) : null;
  }

  async function publishSnapshot(payload = {}) {
    const snapshot = normalizeSnapshot(payload);
    if (!snapshot.results.length) {
      throw createHttpError(400, "result snapshot requires at least one result.");
    }

    const [result] = await pool.execute(
      `INSERT INTO result_snapshots (status, point_scale_json, result_json, published_by)
       VALUES (?, ?, ?, ?)`,
      [
        snapshot.status,
        JSON.stringify(snapshot.pointScale),
        JSON.stringify(snapshot.results),
        snapshot.publishedBy,
      ],
    );

    return {
      ...snapshot,
      id: String(result.insertId || snapshot.id),
    };
  }

  return {
    getLatestSnapshot,
    publishSnapshot,
  };
}

module.exports = {
  createMysqlResultSnapshotsRepository,
};
