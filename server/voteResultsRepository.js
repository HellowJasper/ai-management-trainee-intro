const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_DATA_PATH = path.join(__dirname, "../data/vote-results.json");
const DEFAULT_POINT_SCALE = [100, 85, 70, 55, 40];

function normalizeVoteResults(payload = {}) {
  const source = Array.isArray(payload)
    ? { results: payload }
    : payload;

  return {
    pointScale: Array.isArray(source.pointScale) && source.pointScale.length
      ? source.pointScale
      : DEFAULT_POINT_SCALE,
    status: source.status || "voting",
    windowLabel: source.windowLabel || "投票窗口开启中",
    updatedAt: source.updatedAt || new Date().toISOString(),
    results: Array.isArray(source.results) ? source.results : [],
  };
}

function createVoteResultsRepository(dataPath = DEFAULT_DATA_PATH) {
  const resolvedDataPath = path.resolve(dataPath);

  async function listVoteResults() {
    const raw = await fs.readFile(resolvedDataPath, "utf8");
    return normalizeVoteResults(JSON.parse(raw));
  }

  return {
    listVoteResults,
  };
}

module.exports = {
  DEFAULT_VOTE_POINT_SCALE: DEFAULT_POINT_SCALE,
  createVoteResultsRepository,
};
