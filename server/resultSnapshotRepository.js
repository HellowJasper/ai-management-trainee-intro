const fs = require("node:fs/promises");
const path = require("node:path");
const { createHttpError } = require("./traineeRepository");

const DEFAULT_DATA_PATH = path.join(__dirname, "../data/result-snapshots.json");
const DEFAULT_POINT_SCALE = [100, 85, 70, 55, 40];

function normalizeSnapshot(snapshot = {}) {
  return {
    id: String(snapshot.id || `result_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    status: String(snapshot.status || "published").trim() || "published",
    pointScale: Array.isArray(snapshot.pointScale) && snapshot.pointScale.length
      ? snapshot.pointScale
      : DEFAULT_POINT_SCALE,
    results: Array.isArray(snapshot.results) ? snapshot.results : [],
    publishedBy: String(snapshot.publishedBy || snapshot.actor || "admin").trim() || "admin",
    publishedAt: snapshot.publishedAt || new Date().toISOString(),
  };
}

function normalizeState(payload = {}) {
  return {
    snapshots: Array.isArray(payload.snapshots)
      ? payload.snapshots.map(normalizeSnapshot)
      : [],
  };
}

function createResultSnapshotRepository(dataPath = DEFAULT_DATA_PATH) {
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

  async function publishSnapshot(payload = {}) {
    const snapshot = normalizeSnapshot(payload);
    if (!snapshot.results.length) {
      throw createHttpError(400, "result snapshot requires at least one result.");
    }

    const state = await readState();
    const nextState = {
      snapshots: [snapshot, ...state.snapshots],
    };
    await writeState(nextState);

    return snapshot;
  }

  async function getLatestSnapshot({ status = "published" } = {}) {
    const state = await readState();
    return state.snapshots.find((snapshot) => snapshot.status === status) || null;
  }

  return {
    getLatestSnapshot,
    publishSnapshot,
  };
}

module.exports = {
  createResultSnapshotRepository,
};
