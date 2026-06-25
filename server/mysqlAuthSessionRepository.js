const crypto = require("node:crypto");
const { createHttpError } = require("./traineeRepository");
const { getRolePermissions } = require("../src/logic");

const VALID_ROLES = new Set(["player", "judge", "public", "admin"]);

function normalizeRole(role) {
  const cleanRole = String(role || "").trim();
  return VALID_ROLES.has(cleanRole) ? cleanRole : "";
}

function normalizeUser(payload = {}) {
  return {
    id: String(payload.userId || payload.id || payload.openId || payload.unionId || "").trim(),
    name: String(payload.name || payload.displayName || "").trim(),
    department: String(payload.department || "").trim(),
    avatar: String(payload.avatar || payload.photo || "").trim(),
    openId: String(payload.openId || "").trim(),
    unionId: String(payload.unionId || "").trim(),
  };
}

function createSessionId() {
  return crypto.randomBytes(24).toString("hex");
}

function parseSessionJson(value) {
  if (value && typeof value === "object" && !Buffer.isBuffer(value)) {
    return value;
  }
  if (Buffer.isBuffer(value)) {
    return JSON.parse(value.toString("utf8"));
  }
  if (typeof value === "string") {
    return JSON.parse(value);
  }
  return null;
}

// MySQL-backed session store. Mirrors createAuthSessionRepository() in
// authSessionRepository.js (same createSession/getSession/deleteSession
// contract) but persists sessions in the auth_sessions table — no local files.
function createMysqlAuthSessionRepository(pool) {
  if (!pool || typeof pool.execute !== "function") {
    throw new Error("A mysql2-compatible pool with execute(sql, params) is required.");
  }

  async function createSession(payload = {}) {
    const role = normalizeRole(payload.role);
    if (!role) {
      throw createHttpError(400, "A valid role is required to create a session.");
    }

    const now = new Date().toISOString();
    const sessionId = createSessionId();
    const user = normalizeUser(payload);
    const session = {
      id: sessionId,
      role,
      roles: Array.isArray(payload.roles) && payload.roles.length ? payload.roles : [role],
      user: {
        ...user,
        id: user.id || sessionId,
        name: user.name || "本地用户",
      },
      permissions: getRolePermissions(role),
      createdAt: now,
      updatedAt: now,
      source: payload.source || "local-dev",
    };

    await pool.execute(
      `INSERT INTO auth_sessions (id, role, user_id, source, session_json)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, role, session.user.id, session.source, JSON.stringify(session)],
    );

    return session;
  }

  async function getSession(sessionId) {
    const cleanSessionId = String(sessionId || "").trim();
    if (!cleanSessionId) {
      return null;
    }

    const [rows] = await pool.execute(
      "SELECT session_json FROM auth_sessions WHERE id = ? LIMIT 1",
      [cleanSessionId],
    );
    if (!rows.length) {
      return null;
    }

    const session = parseSessionJson(rows[0].session_json);
    if (session && !session.permissions && session.role) {
      session.permissions = getRolePermissions(session.role);
    }
    return session;
  }

  async function deleteSession(sessionId) {
    const cleanSessionId = String(sessionId || "").trim();
    if (!cleanSessionId) {
      return false;
    }

    const [result] = await pool.execute(
      "DELETE FROM auth_sessions WHERE id = ?",
      [cleanSessionId],
    );
    return result.affectedRows > 0;
  }

  return {
    createSession,
    deleteSession,
    getSession,
  };
}

module.exports = {
  createMysqlAuthSessionRepository,
};
