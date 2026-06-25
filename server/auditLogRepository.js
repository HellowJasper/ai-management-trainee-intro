const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_DATA_PATH = path.join(__dirname, "../data/audit-logs.json");

function normalizeLog(entry = {}) {
  return {
    id: String(entry.id || `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    at: entry.at || entry.createdAt || new Date().toISOString(),
    actor: String(entry.actor || "system").trim() || "system",
    action: String(entry.action || "event.recorded").trim() || "event.recorded",
    targetType: String(entry.targetType || "").trim(),
    targetId: String(entry.targetId || "").trim(),
    message: String(entry.message || entry.action || "记录后台操作").trim(),
    meta: entry.meta && typeof entry.meta === "object" ? entry.meta : {},
  };
}

function normalizeState(payload = {}) {
  const logs = Array.isArray(payload) ? payload : payload.logs;

  return {
    logs: Array.isArray(logs) ? logs.map(normalizeLog) : [],
  };
}

function applyLogFilters(logs = [], filters = {}) {
  const action = String(filters.action || "").trim();
  const actor = String(filters.actor || "").trim().toLowerCase();
  const targetType = String(filters.targetType || "").trim();
  const targetId = String(filters.targetId || "").trim().toLowerCase();

  return logs.filter((log) => {
    if (action && log.action !== action) return false;
    if (actor && !String(log.actor || "").toLowerCase().includes(actor)) return false;
    if (targetType && log.targetType !== targetType) return false;
    if (targetId && !String(log.targetId || "").toLowerCase().includes(targetId)) return false;
    return true;
  });
}

function createAuditLogRepository(dataPath = DEFAULT_DATA_PATH) {
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

  async function listLogs({ limit = 80, action = "", actor = "", targetType = "", targetId = "" } = {}) {
    const state = await readState();
    const cleanLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 80;
    const filteredLogs = applyLogFilters(state.logs, { action, actor, targetType, targetId });

    return {
      logs: filteredLogs.slice(0, cleanLimit),
    };
  }

  async function record(entry = {}) {
    const state = await readState();
    const log = normalizeLog(entry);
    const nextState = {
      logs: [log, ...state.logs],
    };

    await writeState(nextState);
    return log;
  }

  return {
    listLogs,
    record,
  };
}

module.exports = {
  createAuditLogRepository,
};
