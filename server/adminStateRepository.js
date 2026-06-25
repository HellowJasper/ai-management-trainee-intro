const fs = require("node:fs/promises");
const path = require("node:path");
const { createHttpError } = require("./traineeRepository");

const DEFAULT_DATA_PATH = path.join(__dirname, "../data/admin-state.json");

const DEFAULT_STAGES = [
  {
    id: "opening",
    name: "启动仪式",
    subtitle: "活动开场，启动仪式",
    time: "05-22 10:00\n05-22 10:30",
  },
  {
    id: "icebreaker",
    name: "新生破冰",
    subtitle: "数字盲盒，互动破冰",
    time: "05-22 10:30\n05-22 11:15",
  },
  {
    id: "speech",
    name: "总裁讲话",
    subtitle: "集团领导致辞",
    time: "05-22 11:15\n05-22 11:35",
  },
  {
    id: "tracks",
    name: "赛道发布",
    subtitle: "五条赛道发布与解读",
    time: "05-22 11:35\n05-22 12:00",
  },
  {
    id: "team",
    name: "组队开启",
    subtitle: "实时组队，先到先得",
    time: "05-22 14:00\n进行中",
  },
  {
    id: "vote",
    name: "投票开启",
    subtitle: "路演投票开启",
    time: "预计 05-24 10:00\n-",
  },
  {
    id: "result",
    name: "结果发布",
    subtitle: "结果揭晓与颁奖",
    time: "预计 05-24 17:30\n-",
  },
  {
    id: "final",
    name: "冠军展示",
    subtitle: "综合得分与冠军队伍展示",
    time: "预计 05-24 18:00\n-",
  },
];

const DEFAULT_STATE = {
  currentStageId: "team",
  screenOverrideStageId: "",
  updatedAt: "2026-05-22T06:00:00.000Z",
  stages: DEFAULT_STAGES,
  logs: [
    {
      at: "2026-05-22T06:00:05.000Z",
      actor: "admin",
      stageId: "team",
      message: "开启阶段【组队开启】",
    },
  ],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeId(id) {
  return String(id || "").trim();
}

function normalizeDisplayTime(time) {
  return String(time || "").trim();
}

function normalizeAdminStages(stages) {
  const list = Array.isArray(stages) && stages.length > 0
    ? stages.map((stage) => ({ ...stage }))
    : clone(DEFAULT_STAGES);
  const hasFinalStage = list.some((stage) => stage.id === "final");
  const resultStageIndex = list.findIndex((stage) => stage.id === "result");
  const defaultFinalStage = DEFAULT_STAGES.find((stage) => stage.id === "final");

  if (!hasFinalStage && resultStageIndex >= 0 && defaultFinalStage) {
    list.splice(resultStageIndex + 1, 0, { ...defaultFinalStage });
  }

  return list;
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

function normalizeState(state) {
  const stages = normalizeAdminStages(state?.stages);
  const currentStageId = normalizeId(state?.currentStageId) || stages[0].id;
  const stageExists = stages.some((stage) => stage.id === currentStageId);
  const screenOverrideStageId = normalizeId(state?.screenOverrideStageId);
  const screenOverrideStageExists = !screenOverrideStageId
    || stages.some((stage) => stage.id === screenOverrideStageId);

  return withStageStatuses({
    currentStageId: stageExists ? currentStageId : stages[0].id,
    screenOverrideStageId: screenOverrideStageExists ? screenOverrideStageId : "",
    updatedAt: state?.updatedAt || new Date().toISOString(),
    stages,
    logs: Array.isArray(state?.logs) ? state.logs : [],
  });
}

function createAdminStateRepository(dataPath = DEFAULT_DATA_PATH) {
  const resolvedDataPath = path.resolve(dataPath);

  async function writeState(state) {
    await fs.mkdir(path.dirname(resolvedDataPath), { recursive: true });
    await fs.writeFile(resolvedDataPath, `${JSON.stringify(state, null, 2)}\n`);
  }

  async function readState() {
    try {
      const raw = await fs.readFile(resolvedDataPath, "utf8");
      return normalizeState(JSON.parse(raw));
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }

      const state = normalizeState(clone(DEFAULT_STATE));
      await writeState(state);
      return state;
    }
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

    await writeState(nextState);
    return nextState;
  }

  async function setScreenOverride(stageId) {
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
          actor: "admin",
          stageId: cleanStageId,
          message: cleanStageId
            ? `锁定大屏【${stage.name || cleanStageId}】`
            : "取消大屏锁定，恢复跟随流程阶段",
        },
        ...state.logs,
      ],
    });

    await writeState(nextState);
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

    await writeState(nextState);
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
  DEFAULT_ADMIN_STAGES: DEFAULT_STAGES,
  normalizeAdminStages,
  createAdminStateRepository,
};
