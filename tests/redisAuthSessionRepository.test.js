const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createAuthSessionRepositoryFromEnv,
  createRedisAuthSessionRepository,
} = require("../server/redisAuthSessionRepository");

function createFakeRedisClient() {
  const values = new Map();
  const expiries = new Map();
  const calls = [];
  return {
    calls,
    values,
    expiries,
    async set(key, value, options = {}) {
      calls.push(["set", key, value, options]);
      values.set(key, value);
      if (options.EX) {
        expiries.set(key, options.EX);
      }
    },
    async get(key) {
      calls.push(["get", key]);
      return values.get(key) || null;
    },
    async del(key) {
      calls.push(["del", key]);
      const deleted = values.delete(key);
      expiries.delete(key);
      return deleted ? 1 : 0;
    },
  };
}

test("Redis auth session repository stores, reads, expires, and deletes sessions", async () => {
  const redisClient = createFakeRedisClient();
  const repository = createRedisAuthSessionRepository({
    redisClient,
    keyPrefix: "test:session:",
    ttlSeconds: 3600,
  });

  const session = await repository.createSession({
    role: "admin",
    roles: ["admin", "judge"],
    userId: "admin-001",
    name: "管理员",
    department: "AI创新部",
    source: "feishu-oauth",
  });

  assert.equal(session.role, "admin");
  assert.deepEqual(session.roles, ["admin", "judge"]);
  assert.equal(session.user.id, "admin-001");
  assert.equal(session.permissions.canAdmin, true);
  assert.ok(session.id);

  const key = `test:session:${session.id}`;
  assert.equal(redisClient.expiries.get(key), 3600);

  const stored = await repository.getSession(session.id);
  assert.deepEqual(stored, session);

  const deleted = await repository.deleteSession(session.id);
  assert.equal(deleted, true);
  assert.equal(await repository.getSession(session.id), null);
});

test("auth session factory keeps JSON default and switches to Redis when configured", () => {
  const redisClient = createFakeRedisClient();
  const jsonRepository = createAuthSessionRepositoryFromEnv({
    env: {},
    redisClient,
  });
  const redisRepository = createAuthSessionRepositoryFromEnv({
    env: {
      SESSION_BACKEND: "redis",
      SESSION_TTL_SECONDS: "120",
      SESSION_REDIS_PREFIX: "joincare:test:",
    },
    redisClient,
  });

  assert.equal(jsonRepository.backend, "json");
  assert.equal(redisRepository.backend, "redis");
  assert.equal(redisRepository.ttlSeconds, 120);
  assert.equal(redisRepository.keyPrefix, "joincare:test:");
});
