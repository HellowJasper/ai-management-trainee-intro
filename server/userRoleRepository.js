const fs = require("node:fs/promises");
const path = require("node:path");
const { createHttpError } = require("./traineeRepository");

const DEFAULT_DATA_PATH = path.join(__dirname, "../data/user-roles.json");
const VALID_ROLES = new Set(["admin", "judge", "player", "public"]);
const ROLE_PRIORITY = ["admin", "judge", "player", "public"];

function normalizeRole(role) {
  const cleanRole = String(role || "").trim();
  return VALID_ROLES.has(cleanRole) ? cleanRole : "";
}

function normalizeRoles(roles = []) {
  const uniqueRoles = Array.from(new Set((Array.isArray(roles) ? roles : [roles])
    .map(normalizeRole)
    .filter(Boolean)));
  return uniqueRoles.sort((a, b) => ROLE_PRIORITY.indexOf(a) - ROLE_PRIORITY.indexOf(b));
}

function normalizeUser(payload = {}) {
  const id = String(payload.id || payload.userId || payload.openId || payload.unionId || "").trim();
  if (!id) {
    throw createHttpError(400, "user id is required.");
  }

  return {
    id,
    openId: String(payload.openId || payload.feishuOpenId || "").trim(),
    unionId: String(payload.unionId || payload.feishuUnionId || "").trim(),
    name: String(payload.name || payload.displayName || "未命名用户").trim(),
    department: String(payload.department || "").trim(),
    avatar: String(payload.avatar || payload.avatarUrl || payload.photo || "").trim(),
    status: String(payload.status || "active").trim() || "active",
    roles: normalizeRoles(payload.roles || payload.role || []),
    source: String(payload.source || "admin").trim() || "admin",
    updatedAt: payload.updatedAt || new Date().toISOString(),
  };
}

function publicUser(user) {
  const normalized = normalizeUser(user);
  const { source, ...rest } = normalized;
  return rest;
}

function normalizeState(payload = {}) {
  return {
    updatedAt: payload.updatedAt || new Date().toISOString(),
    users: Array.isArray(payload.users) ? payload.users.map(normalizeUser) : [],
  };
}

function matchesLogin(user, payload = {}) {
  const userId = String(payload.userId || payload.id || "").trim();
  const openId = String(payload.openId || "").trim();
  const unionId = String(payload.unionId || "").trim();
  return Boolean(
    (userId && user.id === userId)
      || (openId && user.openId === openId)
      || (unionId && user.unionId === unionId),
  );
}

function createUserRoleRepository(dataPath = DEFAULT_DATA_PATH) {
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

  async function listUsers() {
    const state = await readState();
    return {
      users: state.users.map(publicUser),
    };
  }

  async function upsertUser(payload = {}) {
    const user = normalizeUser(payload);
    if (!user.roles.length) {
      throw createHttpError(400, "at least one valid role is required.");
    }

    const state = await readState();
    const users = state.users.filter((item) => item.id !== user.id);
    const nextUser = {
      ...state.users.find((item) => item.id === user.id),
      ...user,
      updatedAt: new Date().toISOString(),
    };
    await writeState({
      updatedAt: nextUser.updatedAt,
      users: [nextUser, ...users],
    });
    return publicUser(nextUser);
  }

  async function resolveLoginUser(payload = {}) {
    const state = await readState();
    const user = state.users.find((item) => item.status === "active" && matchesLogin(item, payload));
    if (!user || !user.roles.length) {
      return null;
    }

    const cleanUser = publicUser(user);
    return {
      user: cleanUser,
      roles: cleanUser.roles,
      role: cleanUser.roles[0],
    };
  }

  return {
    listUsers,
    resolveLoginUser,
    upsertUser,
  };
}

module.exports = {
  createUserRoleRepository,
  normalizeRoles,
};
