const stages = [
  {
    id: "opening",
    name: "启动仪式",
    subtitle: "活动开场，启动仪式",
    status: "done",
    time: "05-22 10:00\n05-22 10:30",
  },
  {
    id: "icebreaker",
    name: "新生破冰",
    subtitle: "数字盲盒，互动破冰",
    status: "done",
    time: "05-22 10:30\n05-22 11:15",
  },
  {
    id: "speech",
    name: "总裁讲话",
    subtitle: "集团领导致辞",
    status: "done",
    time: "05-22 11:15\n05-22 11:35",
  },
  {
    id: "tracks",
    name: "赛道发布",
    subtitle: "五条赛道发布与解读",
    status: "done",
    time: "05-22 11:35\n05-22 12:00",
  },
  {
    id: "team",
    name: "组队开启",
    subtitle: "实时组队，先到先得",
    status: "active",
    time: "05-22 14:00\n进行中",
  },
  {
    id: "vote",
    name: "投票开启",
    subtitle: "路演投票开启",
    status: "pending",
    time: "预计 05-24 10:00\n-",
  },
  {
    id: "result",
    name: "结果发布",
    subtitle: "投票排名与赋分结果",
    status: "pending",
    time: "预计 05-24 17:30\n-",
  },
  {
    id: "final",
    name: "冠军展示",
    subtitle: "综合得分与冠军队伍展示",
    status: "pending",
    time: "预计 05-24 18:00\n-",
  },
];

let logs = [
  ["14:00:05", "admin", "开启阶段【组队开启】"],
  ["11:35:12", "admin", "结束阶段【总裁讲话】"],
  ["11:35:10", "admin", "开启阶段【赛道发布】"],
  ["10:30:08", "admin", "开启阶段【新生破冰】"],
  ["10:00:06", "admin", "开启阶段【启动仪式】"],
  ["09:58:44", "admin", "登录管理后台"],
  ["09:30:15", "system", "大屏连接成功"],
];

const statusLabel = {
  done: "已完成",
  active: "进行中",
  pending: "未开始",
};

const stageRows = document.querySelector("#stageRows");
const currentStageName = document.querySelector("#currentStageName");
const currentStageTime = document.querySelector("#currentStageTime");
const currentStageStatus = document.querySelector("#currentStageStatus");
const previewStageName = document.querySelector("#previewStageName");
const previewTimeline = document.querySelector("#previewTimeline");
const operationLog = document.querySelector("#operationLog");
const confirmDangerAction = document.querySelector("#confirmDangerAction");
const closeVoteButton = document.querySelector("#closeVoteButton");
const publishResultButton = document.querySelector("#publishResultButton");
const saveDisplayTimesButton = document.querySelector("#saveDisplayTimesButton");
const missionCountdownDuration = document.querySelector("#missionCountdownDuration");
const missionCountdownState = document.querySelector("#missionCountdownState");
const startMissionCountdownButton = document.querySelector("#startMissionCountdownButton");
const resetMissionCountdownButton = document.querySelector("#resetMissionCountdownButton");
const roadshowDuration = document.querySelector("#roadshowDuration");
const roadshowStateLabel = document.querySelector("#roadshowState");
const startRoadshowButton = document.querySelector("#startRoadshowButton");
const resetRoadshowButton = document.querySelector("#resetRoadshowButton");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}

function getActiveStage() {
  return stages.find((stage) => stage.status === "active") || stages[0];
}

function addLog(actor, message) {
  const now = new Date();
  const time = now.toLocaleTimeString("zh-CN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  logs.unshift([time, actor, message]);
  renderLogs();
}

function normalizeLogEntry(entry) {
  if (Array.isArray(entry)) {
    return entry;
  }

  const rawTime = entry?.time || entry?.at || entry?.createdAt || entry?.updatedAt || "";
  const parsedTime = rawTime ? new Date(rawTime) : null;
  const displayTime = parsedTime && !Number.isNaN(parsedTime.getTime())
    ? parsedTime.toLocaleTimeString("zh-CN", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : rawTime || "--:--:--";

  return [
    displayTime,
    entry?.actor || "system",
    entry?.message || String(entry || ""),
  ];
}

function syncStageStatuses(stageId) {
  const nextIndex = stages.findIndex((stage) => stage.id === stageId);

  if (nextIndex < 0) {
    return false;
  }

  stages.forEach((stage, index) => {
    if (index < nextIndex) {
      stage.status = "done";
    } else if (index === nextIndex) {
      stage.status = "active";
    } else {
      stage.status = "pending";
    }
  });

  return true;
}

function applyAdminState(state) {
  if (!state) {
    return;
  }

  if (Array.isArray(state.stages)) {
    state.stages.forEach((remoteStage) => {
      const stage = stages.find((item) => item.id === remoteStage?.id);
      if (!stage) {
        return;
      }

      stage.status = remoteStage.status || stage.status;
      stage.time = remoteStage.time || stage.time;
    });
  }

  if (state.currentStageId) {
    syncStageStatuses(state.currentStageId);
  }

  if (Array.isArray(state.logs)) {
    logs = state.logs.map(normalizeLogEntry);
  }

  render();
}

function setActiveStage(nextId, { writeLog = true } = {}) {
  const nextIndex = stages.findIndex((stage) => stage.id === nextId);

  if (nextIndex < 0) {
    return;
  }

  syncStageStatuses(nextId);

  if (writeLog) {
    addLog("admin", `开启阶段【${stages[nextIndex].name}】`);
  }
  render();
}

async function publishStage(stageId) {
  try {
    const state = await window.AppData.updateAdminStage(stageId);
    applyAdminState(state);
  } catch (error) {
    console.warn("Admin stage sync failed.", error);
    addLog("system", "同步失败：阶段发布未生效，请检查后端连接");
  }
}

async function finishCurrentStage() {
  const activeIndex = stages.findIndex((stage) => stage.status === "active");
  if (activeIndex < 0) {
    return;
  }

  if (stages[activeIndex + 1]) {
    await publishStage(stages[activeIndex + 1].id);
    return;
  }

  addLog("system", "同步失败：当前已是最后阶段，无法继续结束");
}

function durationMsToMinutes(durationMs, fallbackMinutes) {
  const minutes = Math.round((Number(durationMs) || 0) / 60000);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : fallbackMinutes;
}

function minutesInputToDurationMs(input, fallbackMinutes) {
  const minutes = Number(input?.value);
  const cleanMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : fallbackMinutes;
  return Math.round(cleanMinutes * 60000);
}

function formatStartedAt(startedAt) {
  if (!startedAt) return "未启动";
  const parsed = new Date(startedAt);
  if (Number.isNaN(parsed.getTime())) return "未启动";
  return parsed.toLocaleString("zh-CN", { hour12: false });
}

function renderMissionCountdownState(state = {}) {
  if (missionCountdownDuration) {
    missionCountdownDuration.value = String(durationMsToMinutes(state.durationMs, 1440));
  }
  if (missionCountdownState) {
    missionCountdownState.textContent = `状态：${formatStartedAt(state.startedAt)}`;
  }
}

function renderRoadshowState(state = {}) {
  if (roadshowDuration) {
    roadshowDuration.value = String(durationMsToMinutes(state.durationMs, 15));
  }
  if (roadshowStateLabel) {
    roadshowStateLabel.textContent = `状态：${formatStartedAt(state.startedAt)}`;
  }
}

function collectStageDisplayTimes() {
  return [...document.querySelectorAll("[data-stage-time-input]")]
    .map((input) => ({
      id: input.dataset.stageTimeInput,
      time: input.value.trim(),
    }))
    .filter((stage) => stage.id);
}

async function saveDisplayTimes() {
  try {
    const state = await window.AppData.updateAdminDisplayTimes({
      stages: collectStageDisplayTimes(),
    });
    applyAdminState(state);
  } catch (error) {
    console.warn("Display time sync failed.", error);
    addLog("system", "同步失败：时间显示配置未保存");
  }
}

async function loadTimerControls() {
  try {
    renderMissionCountdownState(await window.AppData.loadMissionCountdown());
  } catch (error) {
    console.warn("Mission countdown state load failed.", error);
    if (missionCountdownState) missionCountdownState.textContent = "状态：同步失败";
  }

  try {
    renderRoadshowState(await window.AppData.loadRoadshow());
  } catch (error) {
    console.warn("Roadshow state load failed.", error);
    if (roadshowStateLabel) roadshowStateLabel.textContent = "状态：同步失败";
  }
}

async function updateMissionCountdown(startedAt) {
  try {
    const state = await window.AppData.updateAdminMissionCountdown({
      durationMs: minutesInputToDurationMs(missionCountdownDuration, 1440),
      startedAt,
    });
    renderMissionCountdownState(state);
    addLog("admin", startedAt ? "启动任务倒计时" : "重置任务倒计时");
  } catch (error) {
    console.warn("Mission countdown update failed.", error);
    addLog("system", "同步失败：任务倒计时未更新");
  }
}

async function updateRoadshow(startedAt) {
  try {
    const state = await window.AppData.updateAdminRoadshow({
      durationMs: minutesInputToDurationMs(roadshowDuration, 15),
      startedAt,
    });
    renderRoadshowState(state);
    addLog("admin", startedAt ? "启动路演计时" : "重置路演计时");
  } catch (error) {
    console.warn("Roadshow timer update failed.", error);
    addLog("system", "同步失败：路演计时未更新");
  }
}

function renderCurrentStage() {
  const active = getActiveStage();
  const displayTime = active.time ? active.time.replace("\n", " / ") : "管理员未设置";

  currentStageName.textContent = active.name;
  currentStageTime.textContent = `展示时间：${displayTime}`;
  currentStageStatus.textContent = statusLabel[active.status];
  currentStageStatus.className = `status-pill status-${active.status}`;
  previewStageName.textContent = active.name;
}

function renderRows() {
  stageRows.innerHTML = stages
    .map((stage, index) => {
      const commandClass = stage.status === "active" ? "is-danger" : stage.status === "pending" ? "is-primary" : "";
      const commandText = stage.status === "active" ? "结束阶段" : stage.status === "pending" ? "发布阶段" : "回放";
      const statusClass = `status-pill status-${stage.status}`;
      return `
        <div class="flow-row" role="row">
          <span class="stage-cell" role="cell">
            <i class="stage-index">${index + 1}</i>
            <span class="stage-name">
              <strong>${stage.name}</strong>
              <span>${stage.subtitle}</span>
            </span>
          </span>
          <span role="cell">
            <strong class="${statusClass}">${statusLabel[stage.status]}</strong>
          </span>
          <span class="stage-time" role="cell">
            <textarea class="stage-time-input" data-stage-time-input="${stage.id}" aria-label="${escapeHtml(stage.name)}展示时间">${escapeHtml(stage.time || "")}</textarea>
          </span>
          <span role="cell">
            <button class="stage-command ${commandClass}" type="button" data-stage-command="${stage.id}">${commandText}</button>
          </span>
        </div>
      `;
    })
    .join("");
}

function renderTimeline() {
  previewTimeline.innerHTML = stages
    .map((stage) => `<span class="timeline-node ${stage.status === "active" ? "is-active" : ""}">${stage.name}</span>`)
    .join("");
}

function renderLogs() {
  operationLog.innerHTML = logs
    .slice(0, 9)
    .map(([time, actor, message]) => `<li><span>${time}</span><strong>${actor}</strong><span>${message}</span></li>`)
    .join("");
}

function render() {
  renderCurrentStage();
  renderRows();
  renderTimeline();
  renderLogs();
}

function setupRainCanvas() {
  const canvas = document.querySelector("#adminRain");
  const context = canvas.getContext("2d");
  const chars = "AI星锐黑客松JOINCARE2026";
  const fontSize = 16;
  let columns = [];

  function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    columns = Array.from({ length: Math.ceil(window.innerWidth / fontSize) }, () => Math.random() * window.innerHeight);
  }

  function draw() {
    context.fillStyle = "rgba(2, 8, 14, 0.14)";
    context.fillRect(0, 0, window.innerWidth, window.innerHeight);
    context.fillStyle = "rgba(40, 255, 200, 0.34)";
    context.font = `${fontSize}px Courier New, monospace`;

    columns.forEach((y, index) => {
      const text = chars[Math.floor(Math.random() * chars.length)];
      const x = index * fontSize;
      context.fillText(text, x, y);
      columns[index] = y > window.innerHeight + Math.random() * 400 ? 0 : y + fontSize;
    });

    window.requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener("resize", resize);
}

document.addEventListener("click", async (event) => {
  const command = event.target.closest("[data-stage-command]");
  if (!command) {
    return;
  }

  const stage = stages.find((item) => item.id === command.dataset.stageCommand);
  if (!stage) {
    return;
  }

  if (stage.status === "active") {
    await finishCurrentStage();
  } else if (stage.status === "pending") {
    await publishStage(stage.id);
  } else {
    addLog("admin", `回放阶段【${stage.name}】`);
  }
});

document.querySelector("#startNextStage").addEventListener("click", async () => {
  const activeIndex = stages.findIndex((stage) => stage.status === "active");
  const next = stages[activeIndex + 1];
  if (next) {
    await publishStage(next.id);
  }
});

document.querySelector("#finishCurrentStage").addEventListener("click", finishCurrentStage);

saveDisplayTimesButton?.addEventListener("click", saveDisplayTimes);
startMissionCountdownButton?.addEventListener("click", () => updateMissionCountdown(new Date().toISOString()));
resetMissionCountdownButton?.addEventListener("click", () => updateMissionCountdown(null));
startRoadshowButton?.addEventListener("click", () => updateRoadshow(new Date().toISOString()));
resetRoadshowButton?.addEventListener("click", () => updateRoadshow(null));

document.querySelector("#clearLogButton").addEventListener("click", () => {
  logs.splice(0, logs.length, [new Date().toLocaleTimeString("zh-CN", { hour12: false }), "admin", "清空操作日志"]);
  renderLogs();
});

confirmDangerAction.addEventListener("change", () => {
  const enabled = confirmDangerAction.checked;
  closeVoteButton.disabled = !enabled;
  publishResultButton.disabled = !enabled;
});

[closeVoteButton, publishResultButton].forEach((button) => {
  button.disabled = true;
  button.addEventListener("click", () => {
    addLog("admin", button.textContent.trim());
    confirmDangerAction.checked = false;
    closeVoteButton.disabled = true;
    publishResultButton.disabled = true;
  });
});

async function initAdmin() {
  render();
  setupRainCanvas();

  try {
    const state = await window.AppData.loadAdminState();
    applyAdminState(state);
    await loadTimerControls();
    addLog("system", "后台状态同步完成");
  } catch (error) {
    console.warn("Admin state load failed.", error);
    addLog("system", "同步失败：无法加载后端状态，暂用本地默认阶段");
    await loadTimerControls();
  }
}

initAdmin();
