const { DEFAULT_ADMIN_STAGES } = require("./adminStateRepository");
const { createHttpError } = require("./traineeRepository");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeId(id) {
  return String(id || "").trim();
}

function normalizeDisplayTime(time) {
  return String(time || "").trim();
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
  const stages = Array.isArray(state.stages) && state.stages.length > 0
    ? state.stages
    : clone(DEFAULT_ADMIN_STAGES);
  const currentStageId = normalizeId(state.currentStageId) || stages[0].id;
  const stageExists = stages.some((stage) => stage.id === currentStageId);

  return withStageStatuses({
    currentStageId: stageExists ? currentStageId : stages[0].id,
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
      `SELECT id, name, subtitle, display_time, status, sort_order
       FROM event_stages
       ORDER BY sort_order ASC, id ASC`,
    );
    return rows;
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

  async function readState() {
    const rows = await readRows();
    if (!rows.length) {
      const seededState = normalizeState({
        currentStageId: "team",
        stages: clone(DEFAULT_ADMIN_STAGES),
        logs: [],
      });
      await persistStages(seededState.stages);
      return seededState;
    }

    const stages = rows.map(rowToStage);
    const activeStage = stages.find((stage) => stage.status === "active");
    return normalizeState({
      currentStageId: activeStage?.id || stages[0]?.id,
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
    updateDisplayTimes,
  };
}

module.exports = {
  createMysqlAdminStateRepository,
};
