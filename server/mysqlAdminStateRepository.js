const { DEFAULT_ADMIN_STAGES, normalizeAdminStages } = require("./adminStateRepository");
const { createHttpError } = require("./traineeRepository");

const BIGSCREEN_STATE_ID = "main";
const BIGSCREEN_SCREEN_KEY = "main";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeId(id) {
  return String(id || "").trim();
}

function normalizeDisplayTime(time) {
  return String(time || "").trim();
}

function normalizeTimestamp(value) {
  if (!value) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value).trim();
}

function latestTimestamp(values = []) {
  return values
    .map(normalizeTimestamp)
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = Date.parse(a);
      const bTime = Date.parse(b);
      if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
        return bTime - aTime;
      }
      return b.localeCompare(a);
    })[0] || "";
}

function parseJsonValue(value, fallback = {}) {
  if (Buffer.isBuffer(value)) {
    return JSON.parse(value.toString("utf8"));
  }
  if (typeof value === "string" && value.trim()) {
    return JSON.parse(value);
  }
  if (value && typeof value === "object") {
    return value;
  }
  return fallback;
}

function withStageStatuses(state) {
  const currentIndex = state.stages.findIndex((stage) => stage.id === state.currentStageId);

  return {
    ...state,
    stages: state.stages.map((stage, index) => ({
      ...stage,
      status: index < currentIndex ? "done" : index === currentIndex ? "active" : "pending",
    })),
  };
}

function normalizeState(state = {}) {
  const stages = normalizeAdminStages(
    Array.isArray(state.stages) && state.stages.length > 0
      ? state.stages
      : clone(DEFAULT_ADMIN_STAGES),
  );
  const currentStageId = normalizeId(state.currentStageId) || stages[0].id;
  const stageExists = stages.some((stage) => stage.id === currentStageId);
  const screenOverrideStageId = normalizeId(state.screenOverrideStageId);
  const screenOverrideStageExists = !screenOverrideStageId
    || stages.some((stage) => stage.id === screenOverrideStageId);

  return withStageStatuses({
    currentStageId: stageExists ? currentStageId : stages[0].id,
    screenOverrideStageId: screenOverrideStageExists ? screenOverrideStageId : "",
    updatedAt: state.updatedAt || new Date().toISOString(),
    stages,
    logs: Array.isArray(state.logs) ? state.logs : [],
  });
}

function rowToStage(row = {}) {
  return {
    id: normalizeId(row.id),
    name: String(row.name || "").trim(),
    subtitle: String(row.subtitle || "").trim(),
    time: normalizeDisplayTime(row.display_time || row.displayTime),
    status: String(row.status || "pending").trim(),
  };
}

function createMysqlAdminStateRepository(pool) {
  if (!pool || typeof pool.execute !== "function") {
    throw new Error("A mysql2-compatible pool with execute(sql, params) is required.");
  }

  async function readRows() {
    const [rows] = await pool.execute(
      `SELECT id, name, subtitle, display_time, status, sort_order, updated_at
       FROM event_stages
       ORDER BY sort_order ASC, id ASC`,
    );
    return rows;
  }

  async function readScreenOverride() {
    const [rows] = await pool.execute(
      `SELECT view_name, params_json, updated_at
       FROM bigscreen_state
       WHERE id = ?
       LIMIT 1`,
      [BIGSCREEN_STATE_ID],
    );
    if (!rows.length) {
      return { stageId: "", updatedAt: "" };
    }

    const params = parseJsonValue(rows[0].params_json || rows[0].paramsJson, {});
    return {
      stageId: normalizeId(params.stageId || params.screenOverrideStageId || rows[0].view_name),
      updatedAt: normalizeTimestamp(rows[0].updated_at || rows[0].updatedAt),
    };
  }

  async function persistStages(stages) {
    await Promise.all(stages.map((stage, index) => pool.execute(
      `INSERT INTO event_stages (id, name, subtitle, display_time, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        subtitle = VALUES(subtitle),
        display_time = VALUES(display_time),
        status = VALUES(status),
        sort_order = VALUES(sort_order),
        updated_at = CURRENT_TIMESTAMP`,
      [
        stage.id,
        stage.name,
        stage.subtitle || "",
        normalizeDisplayTime(stage.time),
        stage.status || "pending",
        index,
      ],
    )));
  }

  async function persistScreenOverride(stageId, actor = "") {
    const cleanStageId = normalizeId(stageId);
    await pool.execute(
      `INSERT INTO bigscreen_state (id, screen_key, view_name, params_json, pushed_by)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        screen_key = VALUES(screen_key),
        view_name = VALUES(view_name),
        params_json = VALUES(params_json),
        pushed_by = VALUES(pushed_by),
        updated_at = CURRENT_TIMESTAMP`,
      [
        BIGSCREEN_STATE_ID,
        BIGSCREEN_SCREEN_KEY,
        "stage",
        JSON.stringify({ stageId: cleanStageId }),
        actor,
      ],
    );
  }

  async function readState() {
    const [rows, screenOverride] = await Promise.all([
      readRows(),
      readScreenOverride(),
    ]);
    const screenOverrideStageId = screenOverride.stageId;
    if (!rows.length) {
      const seededState = normalizeState({
        currentStageId: "team",
        screenOverrideStageId,
        stages: clone(DEFAULT_ADMIN_STAGES),
        logs: [],
      });
      await persistStages(seededState.stages);
      return seededState;
    }

    const stages = rows.map(rowToStage);
    const activeStage = stages.find((stage) => stage.status === "active");
    const updatedAt = latestTimestamp([
      screenOverride.updatedAt,
      ...rows.map((row) => row.updated_at || row.updatedAt),
    ]);
    return normalizeState({
      currentStageId: activeStage?.id || stages[0]?.id,
      screenOverrideStageId,
      updatedAt,
      stages,
      logs: [],
    });
  }

  async function getState() {
    return readState();
  }

  async function setCurrentStage(stageId) {
    const cleanStageId = normalizeId(stageId);
    const state = await readState();
    const stage = state.stages.find((item) => item.id === cleanStageId);

    if (!stage) {
      throw createHttpError(400, `Unknown admin stage id: ${cleanStageId || "(empty)"}.`);
    }

    const updatedAt = new Date().toISOString();
    const nextState = normalizeState({
      ...state,
      currentStageId: cleanStageId,
      updatedAt,
      logs: [
        {
          at: updatedAt,
          actor: "admin",
          stageId: cleanStageId,
          message: `开启阶段【${stage.name || cleanStageId}】`,
        },
        ...state.logs,
      ],
    });

    await persistStages(nextState.stages);
    return nextState;
  }

  async function setScreenOverride(stageId, actor = "admin") {
    const cleanStageId = normalizeId(stageId);
    const state = await readState();
    const stage = cleanStageId
      ? state.stages.find((item) => item.id === cleanStageId)
      : null;

    if (cleanStageId && !stage) {
      throw createHttpError(400, `Unknown admin stage id: ${cleanStageId}.`);
    }

    const updatedAt = new Date().toISOString();
    const nextState = normalizeState({
      ...state,
      screenOverrideStageId: cleanStageId,
      updatedAt,
      logs: [
        {
          at: updatedAt,
          actor,
          stageId: cleanStageId,
          message: cleanStageId
            ? `锁定大屏【${stage.name || cleanStageId}】`
            : "取消大屏锁定，恢复跟随流程阶段",
        },
        ...state.logs,
      ],
    });

    await persistScreenOverride(cleanStageId, actor);
    return nextState;
  }

  async function updateDisplayTimes(payload = {}) {
    const state = await readState();
    const incomingStages = Array.isArray(payload.stages) ? payload.stages : [];
    const updatedAt = new Date().toISOString();
    const stageTimesById = new Map(
      incomingStages
        .map((stage) => [normalizeId(stage?.id), normalizeDisplayTime(stage?.time)])
        .filter(([id]) => id),
    );

    const nextState = normalizeState({
      ...state,
      updatedAt,
      stages: state.stages.map((stage) => (
        stageTimesById.has(stage.id)
          ? { ...stage, time: stageTimesById.get(stage.id) }
          : stage
      )),
      logs: [
        {
          at: updatedAt,
          actor: "admin",
          message: "更新时间显示配置",
        },
        ...state.logs,
      ],
    });

    await persistStages(nextState.stages);
    return nextState;
  }

  return {
    getState,
    setCurrentStage,
    setScreenOverride,
    updateDisplayTimes,
  };
}

module.exports = {
  createMysqlAdminStateRepository,
};
