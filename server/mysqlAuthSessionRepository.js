const crypto = require("node:crypto");
const { createHttpError } = require("./traineeRepository");
const { getRolePermissions } = require("../src/logic");

const VALID_ROLES = new Set(["player", "judge", "public", "admin"]);

function normalizeRole(role) {
  const cleanRole = String(role || "").trim();
  return VALID_ROLES.has(cleanRole) ? cleanRole : "";
}

function normalizeRoles(roles) {
  return Array.from(new Set((Array.isArray(roles) ? roles : [roles])
    .map(normalizeRole)
    .filter(Boolean)));
}

function normalizeUser(payload = {}) {
  return {
    id: String(payload.userId || payload.id || "").trim(),
    name: String(payload.name || payload.displayName || "").trim(),
    department: String(payload.department || "").trim(),
    avatar: String(payload.avatar || payload.photo || payload.avatarUrl || "").trim(),
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

// MySQL-backed session store (auth_sessions table) — no local files.
// Supports a "pending" session: when the user has multiple roles, the session is
// created with an empty currentRole (role="") + the full roles list, and the
// frontend picks one via updateSession. Permissions are empty until a role is set.
function createMysqlAuthSessionRepository(pool) {
  if (!pool || typeof pool.execute !== "function") {
    throw new Error("A mysql2-compatible pool with execute(sql, params) is required.");
  }

  async function persist(session) {
    await pool.execute(
      `INSERT INTO auth_sessions (id, role, user_id, source, session_json)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        role = VALUES(role),
        user_id = VALUES(user_id),
        source = VALUES(source),
        session_json = VALUES(session_json),
        updated_at = CURRENT_TIMESTAMP`,
      [session.id, session.role || "", session.user.id, session.source, JSON.stringify(session)],
    );
  }

  async function createSession(payload = {}) {
    const roles = normalizeRoles(payload.roles && payload.roles.length ? payload.roles : payload.role);
    const role = normalizeRole(payload.role);
    if (!role && !roles.length) {
      throw createHttpError(400, "A valid role is required to create a session.");
    }

    const now = new Date().toISOString();
    const sessionId = createSessionId();
    const user = normalizeUser(payload);
    const session = {
      id: sessionId,
      role, // current role; "" means pending selection
      roles: roles.length ? roles : [role],
      user: {
        ...user,
        id: user.id || sessionId,
        name: user.name || "本地用户",
      },
      permissions: role ? getRolePermissions(role) : {},
      createdAt: now,
      updatedAt: now,
      source: payload.source || "local-dev",
    };

    await persist(session);
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
    if (session && session.role && !session.permissions) {
      session.permissions = getRolePermissions(session.role);
    }
    return session;
  }

  async function updateSession(sessionId, patch = {}) {
    const existing = await getSession(sessionId);
    if (!existing) {
      return null;
    }
    const role = normalizeRole(patch.role);
    const next = {
      ...existing,
      role: role || existing.role,
      permissions: role ? getRolePermissions(role) : existing.permissions,
      updatedAt: new Date().toISOString(),
    };
    await persist(next);
    return next;
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
    updateSession,
  };
}

module.exports = {
  createMysqlAuthSessionRepository,
};
