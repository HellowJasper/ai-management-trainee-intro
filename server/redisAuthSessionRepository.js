const crypto = require("node:crypto");
const { createAuthSessionRepository } = require("./authSessionRepository");
const { createHttpError } = require("./traineeRepository");
const { getRolePermissions } = require("../src/logic");

const DEFAULT_KEY_PREFIX = "joincare:session:";
const DEFAULT_TTL_SECONDS = 60 * 60 * 12;
const VALID_ROLES = new Set(["player", "judge", "public", "admin"]);

function createSessionId() {
  return crypto.randomBytes(24).toString("hex");
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

function normalizeTtlSeconds(value) {
  const ttl = Number(value);
  return Number.isFinite(ttl) && ttl > 0 ? Math.floor(ttl) : DEFAULT_TTL_SECONDS;
}

function sessionKey(keyPrefix, sessionId) {
  return `${keyPrefix}${sessionId}`;
}

async function ensureRedisClientConnected(redisClient) {
  if (!redisClient || typeof redisClient.get !== "function" || typeof redisClient.set !== "function" || typeof redisClient.del !== "function") {
    throw new Error("A Redis-compatible client with get/set/del methods is required.");
  }
  if (typeof redisClient.connect === "function" && !redisClient.isOpen) {
    await redisClient.connect();
  }
}

function createRedisAuthSessionRepository({
  redisClient,
  keyPrefix = DEFAULT_KEY_PREFIX,
  ttlSeconds = DEFAULT_TTL_SECONDS,
} = {}) {
  const resolvedKeyPrefix = String(keyPrefix || DEFAULT_KEY_PREFIX);
  const resolvedTtlSeconds = normalizeTtlSeconds(ttlSeconds);

  async function createSession(payload = {}) {
    const role = normalizeRole(payload.role);
    if (!role) {
      throw createHttpError(400, "A valid role is required to create a Redis session.");
    }

    await ensureRedisClientConnected(redisClient);

    const now = new Date().toISOString();
    const id = createSessionId();
    const user = normalizeUser(payload);
    const session = {
      id,
      role,
      roles: Array.isArray(payload.roles) && payload.roles.length ? payload.roles : [role],
      user: {
        ...user,
        id: user.id || id,
        name: user.name || "本地用户",
      },
      permissions: getRolePermissions(role),
      createdAt: now,
      updatedAt: now,
      source: payload.source || "local-dev",
    };

    await redisClient.set(sessionKey(resolvedKeyPrefix, id), JSON.stringify(session), {
      EX: resolvedTtlSeconds,
    });
    return session;
  }

  async function getSession(sessionId) {
    const cleanSessionId = String(sessionId || "").trim();
    if (!cleanSessionId) {
      return null;
    }

    await ensureRedisClientConnected(redisClient);

    const raw = await redisClient.get(sessionKey(resolvedKeyPrefix, cleanSessionId));
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function deleteSession(sessionId) {
    const cleanSessionId = String(sessionId || "").trim();
    if (!cleanSessionId) {
      return false;
    }

    await ensureRedisClientConnected(redisClient);

    const deleted = await redisClient.del(sessionKey(resolvedKeyPrefix, cleanSessionId));
    return Number(deleted) > 0;
  }

  return {
    backend: "redis",
    createSession,
    deleteSession,
    getSession,
    keyPrefix: resolvedKeyPrefix,
    ttlSeconds: resolvedTtlSeconds,
  };
}

function createRedisClientFromEnv({ env = process.env } = {}) {
  const redisUrl = String(env.REDIS_URL || "").trim();
  if (!redisUrl) {
    throw new Error("REDIS_URL is required when SESSION_BACKEND=redis.");
  }

  let redisModule;
  try {
    redisModule = require("redis");
  } catch {
    throw new Error("The redis package is required when SESSION_BACKEND=redis. Run npm install first.");
  }

  return redisModule.createClient({
    url: redisUrl,
  });
}

function createAuthSessionRepositoryFromEnv({
  env = process.env,
  redisClient = null,
} = {}) {
  const backend = String(env.SESSION_BACKEND || "json").trim().toLowerCase();
  if (backend !== "redis") {
    const repository = createAuthSessionRepository();
    return {
      ...repository,
      backend: "json",
    };
  }

  return createRedisAuthSessionRepository({
    redisClient: redisClient || createRedisClientFromEnv({ env }),
    keyPrefix: env.SESSION_REDIS_PREFIX || DEFAULT_KEY_PREFIX,
    ttlSeconds: env.SESSION_TTL_SECONDS || DEFAULT_TTL_SECONDS,
  });
}

module.exports = {
  createAuthSessionRepositoryFromEnv,
  createRedisAuthSessionRepository,
};
