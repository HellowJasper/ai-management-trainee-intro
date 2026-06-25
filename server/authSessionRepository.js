const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createHttpError } = require("./traineeRepository");
const { getRolePermissions } = require("../src/logic");

const DEFAULT_DATA_PATH = path.join(__dirname, "../data/sessions.json");
const VALID_ROLES = new Set(["player", "judge", "public", "admin"]);

function normalizeState(payload = {}) {
  return {
    updatedAt: payload.updatedAt || new Date().toISOString(),
    sessions: payload.sessions && typeof payload.sessions === "object" ? payload.sessions : {},
  };
}

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

function createAuthSessionRepository(dataPath = DEFAULT_DATA_PATH) {
  const resolvedDataPath = path.resolve(dataPath);

  async function writeState(state) {
    await fs.mkdir(path.dirname(resolvedDataPath), { recursive: true });
    await fs.writeFile(resolvedDataPath, `${JSON.stringify(normalizeState(state), null, 2)}\n`);
  }

  async function readState() {
    try {
      const raw = await fs.readFile(resolvedDataPath, "utf8");
      return normalizeState(JSON.parse(raw));
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }

      const state = normalizeState();
      await writeState(state);
      return state;
    }
  }

  async function createSession(payload = {}) {
    const roles = Array.from(new Set((Array.isArray(payload.roles) && payload.roles.length
      ? payload.roles
      : [payload.role]).map(normalizeRole).filter(Boolean)));
    const role = normalizeRole(payload.role);
    if (!role && !roles.length) {
      throw createHttpError(400, "A valid role is required to create a local session.");
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
    const state = await readState();
    const nextState = normalizeState({
      updatedAt: now,
      sessions: {
        ...state.sessions,
        [sessionId]: session,
      },
    });

    await writeState(nextState);
    return session;
  }

  async function getSession(sessionId) {
    const cleanSessionId = String(sessionId || "").trim();
    if (!cleanSessionId) {
      return null;
    }

    const state = await readState();
    return state.sessions[cleanSessionId] || null;
  }

  async function updateSession(sessionId, patch = {}) {
    const cleanSessionId = String(sessionId || "").trim();
    if (!cleanSessionId) {
      return null;
    }
    const state = await readState();
    const existing = state.sessions[cleanSessionId];
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
    await writeState({
      updatedAt: next.updatedAt,
      sessions: { ...state.sessions, [cleanSessionId]: next },
    });
    return next;
  }

  async function deleteSession(sessionId) {
    const cleanSessionId = String(sessionId || "").trim();
    if (!cleanSessionId) {
      return false;
    }

    const state = await readState();
    if (!state.sessions[cleanSessionId]) {
      return false;
    }

    const sessions = { ...state.sessions };
    delete sessions[cleanSessionId];
    await writeState({
      updatedAt: new Date().toISOString(),
      sessions,
    });
    return true;
  }

  return {
    createSession,
    deleteSession,
    getSession,
    updateSession,
  };
}

module.exports = {
  createAuthSessionRepository,
};
