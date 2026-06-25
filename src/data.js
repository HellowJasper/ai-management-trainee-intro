(function attachDataLoader(root, factory) {
  const api = factory(root);
  root.AppApi = api;
  root.AppData = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createDataLoader(root) {
  const FEISHU_LOGIN_REDIRECT = "./site.html#home";
  const DEFAULT_COUNTDOWN_DURATION_MS = 24 * 60 * 60 * 1000;
  const DEFAULT_COUNTDOWN_STORAGE_KEY = "joincare_mission_countdown_started_at_manual_v2";
  const DEFAULT_ROADSHOW_DURATION_MS = 15 * 60 * 1000;
  const DEFAULT_ROADSHOW_STORAGE_KEY = "joincare_roadshow_timer_started_at_manual_v1";
  const TEAM_SCENARIO_DEFAULTS = {
    pharma: {
      hostDepartment: "药学研发中心",
      hostDepartmentEn: "PHARMACEUTICAL R&D CENTER",
      focus: "文献挖掘、靶点筛选、处方工艺、专利检索。",
      focusEn: "Literature Mining, Target Screening, Formulation Process, Patent Search.",
      scenarios: ["药物信息检索助手", "实验方案生成", "文献摘要与对比"],
      scenariosEn: ["Drug Information Retrieval Assistant", "Experiment Plan Generation", "Literature Summary and Comparison"],
      deliverable: "知识库 + 分析报告 + 可演示 Demo。",
      deliverableEn: "Knowledge Base + Analysis Report + Demo.",
      docUrl: "",
    },
    medicine: {
      hostDepartment: "临床研发中心",
      hostDepartmentEn: "CLINICAL R&D CENTER",
      focus: "临床资料、医学问答、病例归纳、研究辅助。",
      focusEn: "Clinical Data, Medical Q&A, Case Summaries, Research Assistance.",
      scenarios: ["医学资料问答", "临床方案比对", "研究资料结构化"],
      scenariosEn: ["Medical Data Q&A", "Clinical Plan Comparison", "Research Data Structuring"],
      deliverable: "问答系统 + 资料库 + 风险提示。",
      deliverableEn: "Q&A System + Knowledge Base + Risk Alerts.",
      docUrl: "",
    },
    marketing: {
      hostDepartment: "健康品事业部",
      hostDepartmentEn: "HEALTH PRODUCTS BUSINESS UNIT",
      focus: "用户洞察、内容生成、投放优化、经营分析。",
      focusEn: "User Insight, Content Generation, Media Optimization, Business Analytics.",
      scenarios: ["营销文案生成", "客户分层与标签", "活动复盘和 ROI 分析"],
      scenariosEn: ["Marketing Copy Generation", "Customer Segmentation and Tagging", "Campaign Review and ROI Analysis"],
      deliverable: "营销助手 + 内容模板 + 数据看板。",
      deliverableEn: "Marketing Assistant + Content Templates + Data Dashboard.",
      docUrl: "",
    },
    functions: {
      hostDepartment: "董事长办公室",
      hostDepartmentEn: "CHAIRMAN OFFICE",
      focus: "流程自动化、知识管理、会议纪要、制度问答。",
      focusEn: "Workflow Automation, Knowledge Management, Meeting Minutes, Policy Q&A.",
      scenarios: ["办公 Copilot", "制度检索与问答", "会议总结与待办提取"],
      scenariosEn: ["Office Copilot", "Policy Search and Q&A", "Meeting Summary and Action Extraction"],
      deliverable: "流程助手 + 问答库 + 自动化脚本。",
      deliverableEn: "Workflow Assistant + Q&A Base + Automation Scripts.",
      docUrl: "",
    },
    production: {
      hostDepartment: "生产管理中心",
      hostDepartmentEn: "PRODUCTION MANAGEMENT CENTER",
      focus: "智能制造、质量管控、设备预测、排产优化。",
      focusEn: "Smart Manufacturing, Quality Control, Equipment Prediction, Scheduling Optimization.",
      scenarios: ["质检视觉识别", "设备维保预测", "能耗监控与排班建议"],
      scenariosEn: ["Visual Quality Inspection", "Equipment Maintenance Prediction", "Energy Monitoring and Shift Recommendations"],
      deliverable: "生产看板 + 预警模型 + 操作建议。",
      deliverableEn: "Production Dashboard + Warning Model + Operation Recommendations.",
      docUrl: "",
    },
  };

  function getRuntimeApiBaseUrl() {
    const runtimeConfig = root.JoincareRuntimeConfig || {};
    const value = root.JOINCARE_API_BASE_URL || runtimeConfig.apiBaseUrl || "";
    return String(value || "").trim().replace(/\/+$/, "");
  }

  function resolveApiUrl(url) {
    const value = String(url || "");
    if (!value.startsWith("/api/") && value !== "/api") {
      return value;
    }

    const apiBaseUrl = getRuntimeApiBaseUrl();
    return apiBaseUrl ? `${apiBaseUrl}${value}` : value;
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(resolveApiUrl(url), {
      cache: "no-store",
      credentials: "include",
      ...options,
      headers: {
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      let errorMessage = "";
      try {
        const payload = await response.json();
        errorMessage = payload?.error?.message || payload?.message || "";
      } catch {
        try {
          const text = await response.text();
          errorMessage = text || "";
        } catch {
          errorMessage = "";
        }
      }

      throw new Error(errorMessage || `Request failed: ${response.status} ${url}`);
    }

    return response.json();
  }

  async function loadTrainees(fallbackTrainees = []) {
    const sources = [
      () => fetchJson("/api/trainees"),
      () => fetchJson("./data/trainees.json"),
    ];

    for (const source of sources) {
      try {
        const trainees = await source();
        if (!Array.isArray(trainees)) {
          throw new Error("Trainee data must be an array.");
        }

        return trainees.map(normalizeTraineeRecord);
      } catch (error) {
        console.warn(error);
      }
    }

    return fallbackTrainees.map(normalizeTraineeRecord);
  }

  function normalizeTraineeRecord(trainee) {
    if (root.AppLogic && typeof root.AppLogic.normalizeTrainee === "function") {
      return root.AppLogic.normalizeTrainee(trainee);
    }

    return trainee;
  }

  async function loadAdminState() {
    return fetchJson("/api/admin/state");
  }

  async function loadHealth() {
    return fetchJson("/api/health");
  }

  async function loadSiteBootstrap() {
    return fetchJson("/api/site/bootstrap");
  }

  async function loadTeams(fallbackTeams = []) {
    const sources = [
      () => fetchJson("/api/teams"),
      () => fetchJson("./data/teams.json"),
    ];

    for (const source of sources) {
      try {
        const teams = await source();
        if (!Array.isArray(teams)) {
          throw new Error("Team data must be an array.");
        }

        return applyTeamScenarioDefaults(teams, fallbackTeams);
      } catch (error) {
        console.warn(error);
      }
    }

    return applyTeamScenarioDefaults(fallbackTeams, fallbackTeams);
  }

  function withMissingTeamScenarioDefaults(team = {}, fallbackTeam = {}) {
    const teamId = String(team.id || fallbackTeam.id || "").trim();
    const defaults = {
      ...(TEAM_SCENARIO_DEFAULTS[teamId] || {}),
      ...(fallbackTeam || {}),
    };
    const next = { ...defaults, ...team };

    [
      "hostDepartment",
      "hostDepartmentEn",
      "focus",
      "focusEn",
      "deliverable",
      "deliverableEn",
      "docUrl",
    ].forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(team, field) || team[field] === null || typeof team[field] === "undefined") {
        next[field] = defaults[field] || "";
      }
    });
    ["scenarios", "scenariosEn"].forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(team, field) || !Array.isArray(team[field])) {
        next[field] = Array.isArray(defaults[field]) ? defaults[field] : [];
      }
    });

    return next;
  }

  function applyTeamScenarioDefaults(teams = [], fallbackTeams = []) {
    const fallbackById = new Map((Array.isArray(fallbackTeams) ? fallbackTeams : [])
      .map((team) => [String(team?.id || "").trim(), team]));
    return (Array.isArray(teams) ? teams : []).map((team) => {
      const teamId = String(team?.id || "").trim();
      return withMissingTeamScenarioDefaults(team, fallbackById.get(teamId) || {});
    });
  }

  async function addAdminTeamMember(payload) {
    return fetchJson("/api/admin/team-members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });
  }

  async function removeAdminTeamMember(payload) {
    return fetchJson("/api/admin/team-members", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });
  }

  async function updateAdminTeamStatus(teamId, payload = {}) {
    return fetchJson(`/api/admin/teams/${encodeURIComponent(teamId)}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });
  }

  async function updateTeamScenario(teamId, payload = {}) {
    const result = await fetchJson(`/api/admin/teams/${encodeURIComponent(teamId)}/scenario`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });

    const teams = applyTeamScenarioDefaults(result?.teams || []);
    return {
      ...result,
      teams,
      team: withMissingTeamScenarioDefaults(result?.team || {}),
    };
  }

  function toCountdownTimestamp(startedAt) {
    if (startedAt === null || typeof startedAt === "undefined" || startedAt === "") {
      return 0;
    }

    const timestamp = typeof startedAt === "number" ? startedAt : Date.parse(String(startedAt));
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
  }

  function normalizeMissionCountdownState(
    state = {},
    { durationMs = DEFAULT_COUNTDOWN_DURATION_MS, mode = "api" } = {},
  ) {
    const cleanDurationMs = Number(state.durationMs || durationMs);

    return {
      startedAt: toCountdownTimestamp(state.startedAt),
      durationMs: Number.isFinite(cleanDurationMs) && cleanDurationMs > 0
        ? cleanDurationMs
        : DEFAULT_COUNTDOWN_DURATION_MS,
      serverNow: state.serverNow || "",
      mode: state.mode || mode,
    };
  }

  function readLocalMissionCountdown({ storageKey = DEFAULT_COUNTDOWN_STORAGE_KEY, durationMs = DEFAULT_COUNTDOWN_DURATION_MS } = {}) {
    try {
      return normalizeMissionCountdownState(
        {
          startedAt: root.localStorage?.getItem(storageKey),
          durationMs,
        },
        { durationMs, mode: "local" },
      );
    } catch {
      return normalizeMissionCountdownState({ durationMs }, { durationMs, mode: "memory" });
    }
  }

  function writeLocalMissionCountdown({
    storageKey = DEFAULT_COUNTDOWN_STORAGE_KEY,
    durationMs = DEFAULT_COUNTDOWN_DURATION_MS,
    startedAt,
  } = {}) {
    const state = normalizeMissionCountdownState({ startedAt, durationMs }, { durationMs, mode: "local" });

    try {
      if (state.startedAt) {
        root.localStorage?.setItem(storageKey, String(state.startedAt));
      }
    } catch {
      // localStorage is optional; keep the normalized state for the current page session.
    }

    return state;
  }

  async function loadMissionCountdown({
    storageKey = DEFAULT_COUNTDOWN_STORAGE_KEY,
    durationMs = DEFAULT_COUNTDOWN_DURATION_MS,
  } = {}) {
    if (root.JoincareMissionCountdown && typeof root.JoincareMissionCountdown.load === "function") {
      try {
        const bridgeState = await root.JoincareMissionCountdown.load({ storageKey, durationMs });
        return normalizeMissionCountdownState(bridgeState, { durationMs, mode: "bridge" });
      } catch (error) {
        console.warn(error);
      }
    }

    try {
      return normalizeMissionCountdownState(
        await fetchJson("/api/mission-countdown"),
        { durationMs, mode: "api" },
      );
    } catch (error) {
      console.warn(error);
    }

    return readLocalMissionCountdown({ storageKey, durationMs });
  }

  async function startMissionCountdown({
    storageKey = DEFAULT_COUNTDOWN_STORAGE_KEY,
    durationMs = DEFAULT_COUNTDOWN_DURATION_MS,
    startedAt = Date.now(),
  } = {}) {
    const cleanStartedAt = toCountdownTimestamp(startedAt) || Date.now();

    if (root.JoincareMissionCountdown && typeof root.JoincareMissionCountdown.start === "function") {
      try {
        const bridgeState = await root.JoincareMissionCountdown.start({
          storageKey,
          durationMs,
          startedAt: cleanStartedAt,
        });
        return normalizeMissionCountdownState(bridgeState, { durationMs, mode: "bridge" });
      } catch (error) {
        console.warn(error);
      }
    }

    try {
      return normalizeMissionCountdownState(
        await fetchJson("/api/mission-countdown/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startedAt: new Date(cleanStartedAt).toISOString(),
            durationMs,
          }),
        }),
        { durationMs, mode: "api" },
      );
    } catch (error) {
      console.warn(error);
    }

    return writeLocalMissionCountdown({ storageKey, durationMs, startedAt: cleanStartedAt });
  }

  function normalizeRoadshowState(
    state = {},
    { durationMs = DEFAULT_ROADSHOW_DURATION_MS, mode = "api" } = {},
  ) {
    const cleanDurationMs = Number(state.durationMs || durationMs);

    return {
      currentTeamId: state.currentTeamId || state.teamId || "marketing",
      currentTeam: state.currentTeam || state.team || null,
      nextTeamId: state.nextTeamId || "functions",
      nextTeam: state.nextTeam || null,
      phase: state.phase || "DEMO",
      startedAt: toCountdownTimestamp(state.startedAt),
      durationMs: Number.isFinite(cleanDurationMs) && cleanDurationMs > 0
        ? cleanDurationMs
        : DEFAULT_ROADSHOW_DURATION_MS,
      serverNow: state.serverNow || "",
      mode: state.mode || mode,
    };
  }

  function readLocalRoadshow({ storageKey = DEFAULT_ROADSHOW_STORAGE_KEY, durationMs = DEFAULT_ROADSHOW_DURATION_MS } = {}) {
    try {
      return normalizeRoadshowState(
        {
          currentTeamId: root.localStorage?.getItem(`${storageKey}:team`) || "marketing",
          nextTeamId: root.localStorage?.getItem(`${storageKey}:nextTeam`) || "functions",
          startedAt: root.localStorage?.getItem(storageKey),
          durationMs,
        },
        { durationMs, mode: "local" },
      );
    } catch {
      return normalizeRoadshowState({ durationMs }, { durationMs, mode: "memory" });
    }
  }

  function writeLocalRoadshow({
    storageKey = DEFAULT_ROADSHOW_STORAGE_KEY,
    durationMs = DEFAULT_ROADSHOW_DURATION_MS,
    currentTeamId = "marketing",
    nextTeamId = "functions",
    startedAt,
  } = {}) {
    const state = normalizeRoadshowState({ currentTeamId, nextTeamId, startedAt, durationMs }, { durationMs, mode: "local" });

    try {
      if (state.currentTeamId) {
        root.localStorage?.setItem(`${storageKey}:team`, state.currentTeamId);
      }
      if (state.nextTeamId) {
        root.localStorage?.setItem(`${storageKey}:nextTeam`, state.nextTeamId);
      }
      if (state.startedAt) {
        root.localStorage?.setItem(storageKey, String(state.startedAt));
      }
    } catch {
      // localStorage is optional; keep the normalized state for this session.
    }

    return state;
  }

  async function loadRoadshow({
    storageKey = DEFAULT_ROADSHOW_STORAGE_KEY,
    durationMs = DEFAULT_ROADSHOW_DURATION_MS,
  } = {}) {
    if (root.JoincareRoadshowTimer && typeof root.JoincareRoadshowTimer.load === "function") {
      try {
        const bridgeState = await root.JoincareRoadshowTimer.load({ storageKey, durationMs });
        return normalizeRoadshowState(bridgeState, { durationMs, mode: "bridge" });
      } catch (error) {
        console.warn(error);
      }
    }

    try {
      return normalizeRoadshowState(
        await fetchJson("/api/roadshow"),
        { durationMs, mode: "api" },
      );
    } catch (error) {
      console.warn(error);
    }

    return readLocalRoadshow({ storageKey, durationMs });
  }

  async function startRoadshowTimer({
    storageKey = DEFAULT_ROADSHOW_STORAGE_KEY,
    durationMs = DEFAULT_ROADSHOW_DURATION_MS,
    currentTeamId = "marketing",
    nextTeamId = "functions",
    startedAt = Date.now(),
  } = {}) {
    const cleanStartedAt = toCountdownTimestamp(startedAt) || Date.now();

    if (root.JoincareRoadshowTimer && typeof root.JoincareRoadshowTimer.start === "function") {
      try {
        const bridgeState = await root.JoincareRoadshowTimer.start({
          storageKey,
          durationMs,
          currentTeamId,
          nextTeamId,
          startedAt: cleanStartedAt,
        });
        return normalizeRoadshowState(bridgeState, { durationMs, mode: "bridge" });
      } catch (error) {
        console.warn(error);
      }
    }

    try {
      return normalizeRoadshowState(
        await fetchJson("/api/roadshow/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentTeamId,
            nextTeamId,
            startedAt: new Date(cleanStartedAt).toISOString(),
            durationMs,
          }),
        }),
        { durationMs, mode: "api" },
      );
    } catch (error) {
      console.warn(error);
    }

    return writeLocalRoadshow({ storageKey, durationMs, currentTeamId, nextTeamId, startedAt: cleanStartedAt });
  }

  function normalizeVoteResults(payload, fallback = []) {
    const source = Array.isArray(payload)
      ? { pointScale: [100, 85, 70, 55, 40], results: payload }
      : payload || {};
    const results = Array.isArray(source.results) ? source.results : fallback;
    const pointScale = Array.isArray(source.pointScale) && source.pointScale.length
      ? source.pointScale
      : [100, 85, 70, 55, 40];

    return {
      pointScale,
      results,
      status: source.status || "voting",
      windowLabel: source.windowLabel || "投票窗口开启中",
      updatedAt: source.updatedAt || "",
    };
  }

  async function loadVoteResults(fallback = []) {
    const sources = [
      () => fetchJson("/api/vote-results"),
      () => fetchJson("./data/vote-results.json"),
    ];

    for (const source of sources) {
      try {
        const payload = normalizeVoteResults(await source(), fallback);
        if (!Array.isArray(payload.results)) {
          throw new Error("Vote results data must include a results array.");
        }

        return payload;
      } catch (error) {
        console.warn(error);
      }
    }

    return normalizeVoteResults({ results: fallback });
  }

  async function loadWorks(fallback = []) {
    try {
      const payload = await fetchJson("/api/works");
      return Array.isArray(payload) ? payload : fallback;
    } catch (error) {
      console.warn(error);
      return fallback;
    }
  }

  async function loadJudgeScores(fallback = { scores: {} }) {
    try {
      const payload = await fetchJson("/api/judge/scores");
      return payload && typeof payload === "object" ? payload : fallback;
    } catch (error) {
      console.warn(error);
      return fallback;
    }
  }

  async function loadJudgeProgress(fallback = { judges: [], teams: [], judgeCount: 0, teamCount: 0, locked: false }) {
    try {
      const payload = await fetchJson("/api/admin/judge/progress");
      return payload && typeof payload === "object" ? payload : fallback;
    } catch (error) {
      console.warn(error);
      return fallback;
    }
  }

  async function lockJudgeScores(payload = {}) {
    return fetchJson("/api/admin/judge/lock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });
  }

  async function loadAuditLogs(filters = {}, fallback = { logs: [] }) {
    try {
      const params = new URLSearchParams();
      Object.entries(filters || {}).forEach(([key, value]) => {
        const cleanValue = String(value ?? "").trim();
        if (cleanValue) {
          params.set(key, cleanValue);
        }
      });
      const query = params.toString();
      const payload = await fetchJson(`/api/admin/audit-logs${query ? `?${query}` : ""}`);
      return payload && typeof payload === "object" ? payload : fallback;
    } catch (error) {
      console.warn(error);
      return {
        ...fallback,
        error: error?.message || "审计日志请求失败",
      };
    }
  }

  async function submitWork(payload = {}) {
    return fetchJson("/api/work/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });
  }

  async function updateAdminWorkStatus(teamId, payload = {}) {
    return fetchJson(`/api/admin/works/${encodeURIComponent(teamId)}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });
  }

  async function updateAdminVoteWindow(status, payload = {}) {
    return fetchJson("/api/admin/vote-window", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(payload || {}),
        status,
      }),
    });
  }

  async function publishAdminResults(payload = {}) {
    return fetchJson("/api/admin/results/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });
  }

  async function loadLatestResultSnapshot(fallback = { snapshot: null }) {
    try {
      const payload = await fetchJson("/api/results/latest");
      return payload && typeof payload === "object" ? payload : fallback;
    } catch (error) {
      console.warn(error);
      return fallback;
    }
  }

  async function loadAdminUsers(fallback = { users: [] }) {
    try {
      const payload = await fetchJson("/api/admin/users");
      return payload && typeof payload === "object" ? payload : fallback;
    } catch (error) {
      console.warn(error);
      return fallback;
    }
  }

  async function upsertAdminUser(payload = {}) {
    return fetchJson("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });
  }

  async function loadCurrentUser() {
    return fetchJson("/api/me");
  }

  async function logoutCurrentUser() {
    return fetchJson("/api/auth/logout", {
      method: "POST",
    });
  }

  async function updateAdminStage(stageId) {
    return fetchJson("/api/admin/stage", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ stageId }),
    });
  }

  async function updateAdminScreenOverride(stageId) {
    return fetchJson("/api/admin/screen-override", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ stageId: stageId || "" }),
    });
  }

  async function updateAdminDisplayTimes(payload = {}) {
    return fetchJson("/api/admin/display-times", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });
  }

  async function updateAdminMissionCountdown(payload = {}) {
    return fetchJson("/api/admin/mission-countdown", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });
  }

  async function updateAdminRoadshow(payload = {}) {
    return fetchJson("/api/admin/roadshow", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });
  }

  function readFeishuSession(sessionKey) {
    try {
      return root.sessionStorage?.getItem(sessionKey) || "";
    } catch {
      return "";
    }
  }

  function writeFeishuSession(sessionKey, value) {
    try {
      root.sessionStorage?.setItem(sessionKey, value);
    } catch {
      // Ignore storage failures so the later real Feishu integration can still decide the redirect.
    }
  }

  async function loginWithFeishu({ redirectUrl = FEISHU_LOGIN_REDIRECT, sessionKey = "joincare_feishu_login" } = {}) {
    const existingSession = readFeishuSession(sessionKey);
    if (existingSession) {
      return {
        authenticated: true,
        firstLoginRequired: false,
        mode: "cached",
        redirectUrl,
      };
    }

    if (root.JoincareFeishuAuth && typeof root.JoincareFeishuAuth.login === "function") {
      return root.JoincareFeishuAuth.login({ redirectUrl, sessionKey });
    }

    writeFeishuSession(sessionKey, "placeholder");

    return {
      authenticated: true,
      firstLoginRequired: true,
      mode: "placeholder",
      redirectUrl,
    };
  }

  async function saveSentence(traineeId, sentence) {
    const trainee = await fetchJson(`/api/trainees/${encodeURIComponent(traineeId)}/sentence`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sentence }),
    });

    return normalizeTraineeRecord(trainee);
  }

  async function updateTrainee(traineeId, payload) {
    const trainee = await fetchJson(`/api/trainees/${encodeURIComponent(traineeId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });

    return normalizeTraineeRecord(trainee);
  }

  async function createTrainee(payload) {
    const trainee = await fetchJson("/api/trainees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });

    return normalizeTraineeRecord(trainee);
  }

  async function deleteTrainee(traineeId) {
    try {
      return await fetchJson(`/api/trainees/${encodeURIComponent(traineeId)}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.warn(error);
      throw error;
    }
  }

  async function uploadTraineeAsset(payload) {
    return fetchJson("/api/admin/trainee-assets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });
  }

  return {
    addAdminTeamMember,
    createTrainee,
    deleteTrainee,
    fetchJson,
    loadAdminState,
    loadAuditLogs,
    loadHealth,
    loadAdminUsers,
    loadSiteBootstrap,
    loadJudgeProgress,
    loadJudgeScores,
    loadLatestResultSnapshot,
    loadMissionCountdown,
    loadRoadshow,
    loadTeams,
    loadTrainees,
    loadVoteResults,
    loadWorks,
    loadCurrentUser,
    loginWithFeishu,
    lockJudgeScores,
    logoutCurrentUser,
    publishAdminResults,
    saveSentence,
    submitWork,
    removeAdminTeamMember,
    upsertAdminUser,
    updateAdminTeamStatus,
    updateAdminStage,
    updateAdminScreenOverride,
    updateAdminDisplayTimes,
    updateAdminMissionCountdown,
    updateAdminRoadshow,
    updateAdminVoteWindow,
    updateAdminWorkStatus,
    updateTeamScenario,
    uploadTraineeAsset,
    resolveApiUrl,
    startMissionCountdown,
    startRoadshowTimer,
    updateTrainee,
  };
});
