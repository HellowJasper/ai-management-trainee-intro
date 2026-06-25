const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_DATA_PATH = path.join(__dirname, "../data/oauth-states.json");
const DEFAULT_TTL_MS = 10 * 60 * 1000;

function createStateToken() {
  return crypto.randomBytes(24).toString("hex");
}

function normalizeStateFile(payload = {}) {
  return {
    updatedAt: payload.updatedAt || new Date().toISOString(),
    states: payload.states && typeof payload.states === "object" ? payload.states : {},
  };
}

function createOAuthStateRepository(dataPath = DEFAULT_DATA_PATH, { ttlMs = DEFAULT_TTL_MS } = {}) {
  const resolvedDataPath = path.resolve(dataPath);

  async function writeStateFile(state) {
    await fs.mkdir(path.dirname(resolvedDataPath), { recursive: true });
    await fs.writeFile(resolvedDataPath, `${JSON.stringify(normalizeStateFile(state), null, 2)}\n`);
  }

  async function readStateFile() {
    try {
      const raw = await fs.readFile(resolvedDataPath, "utf8");
      return normalizeStateFile(JSON.parse(raw));
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      const state = normalizeStateFile();
      await writeStateFile(state);
      return state;
    }
  }

  async function createState(payload = {}) {
    const now = new Date();
    const state = createStateToken();
    const record = {
      state,
      provider: String(payload.provider || "feishu").trim(),
      redirectPath: String(payload.redirectPath || "/site.html#me").trim(),
      redirectUri: String(payload.redirectUri || "").trim(),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    };
    const stateFile = await readStateFile();
    await writeStateFile({
      updatedAt: record.createdAt,
      states: {
        ...stateFile.states,
        [state]: record,
      },
    });
    return record;
  }

  async function consumeState(state) {
    const cleanState = String(state || "").trim();
    if (!cleanState) {
      return null;
    }

    const stateFile = await readStateFile();
    const record = stateFile.states[cleanState] || null;
    if (!record) {
      return null;
    }

    const nextStates = { ...stateFile.states };
    delete nextStates[cleanState];
    await writeStateFile({
      updatedAt: new Date().toISOString(),
      states: nextStates,
    });

    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
      return null;
    }
    return record;
  }

  return {
    consumeState,
    createState,
  };
}

module.exports = {
  createOAuthStateRepository,
};
