function parseJsonValue(value) {
  if (!value) {
    return null;
  }
  if (Buffer.isBuffer(value)) {
    return JSON.parse(value.toString("utf8"));
  }
  if (typeof value === "string") {
    return JSON.parse(value);
  }
  if (value && typeof value === "object") {
    return value;
  }
  return null;
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

function normalizeLog(entry = {}) {
  return {
    id: String(entry.id || `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    at: entry.at || entry.createdAt || new Date().toISOString(),
    actor: String(entry.actor || "system").trim() || "system",
    action: String(entry.action || "event.recorded").trim() || "event.recorded",
    targetType: String(entry.targetType || entry.target_type || "").trim(),
    targetId: String(entry.targetId || entry.target_id || "").trim(),
    message: String(entry.message || entry.action || "记录后台操作").trim(),
    meta: entry.meta && typeof entry.meta === "object" ? entry.meta : {},
  };
}

function rowToLog(row = {}) {
  const before = parseJsonValue(row.before_json || row.beforeJson);
  const after = parseJsonValue(row.after_json || row.afterJson);
  return normalizeLog({
    id: row.id,
    at: normalizeDate(row.created_at || row.createdAt),
    actor: row.actor,
    action: row.action,
    targetType: row.target_type || row.targetType,
    targetId: row.target_id || row.targetId,
    message: row.message,
    meta: {
      ...(before ? { before } : {}),
      ...(after ? { after } : {}),
      ...(row.ip ? { ip: row.ip } : {}),
    },
  });
}

function createMysqlAuditLogRepository(pool) {
  if (!pool || typeof pool.execute !== "function") {
    throw new Error("A mysql2-compatible pool with execute(sql, params) is required.");
  }

  async function listLogs({ limit = 80 } = {}) {
    const cleanLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 80;
    const [rows] = await pool.execute(
      `SELECT id, actor, action, target_type, target_id, message, before_json, after_json, ip, created_at
       FROM audit_logs
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [cleanLimit],
    );

    return {
      logs: rows.map(rowToLog),
    };
  }

  async function record(entry = {}) {
    const log = normalizeLog(entry);
    const beforeJson = entry.before && typeof entry.before === "object" ? JSON.stringify(entry.before) : null;
    const afterJson = entry.after && typeof entry.after === "object" ? JSON.stringify(entry.after) : null;
    const [result] = await pool.execute(
      `INSERT INTO audit_logs
        (actor, action, target_type, target_id, message, before_json, after_json, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.actor,
        log.action,
        log.targetType,
        log.targetId,
        log.message,
        beforeJson,
        afterJson,
        String(entry.ip || "").trim(),
      ],
    );

    return {
      ...log,
      id: String(result.insertId || log.id),
    };
  }

  return {
    listLogs,
    record,
  };
}

module.exports = {
  createMysqlAuditLogRepository,
};
