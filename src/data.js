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

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      cache: "no-store",
      ...options,
      headers: {
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${url}`);
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

        return trainees.map(root.AppLogic.normalizeTrainee);
      } catch (error) {
        console.warn(error);
      }
    }

    return fallbackTrainees.map(root.AppLogic.normalizeTrainee);
  }

  async function loadAdminState() {
    return fetchJson("/api/admin/state");
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

        return teams;
      } catch (error) {
        console.warn(error);
      }
    }

    return fallbackTeams;
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
      windowLabel: source.windowLabel || "大众投票窗口开启中",
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

  async function updateAdminStage(stageId) {
    return fetchJson("/api/admin/stage", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ stageId }),
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

    return root.AppLogic.normalizeTrainee(trainee);
  }

  async function updateTrainee(traineeId, payload) {
    const trainee = await fetchJson(`/api/trainees/${encodeURIComponent(traineeId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });

    return root.AppLogic.normalizeTrainee(trainee);
  }

  async function createTrainee(payload) {
    const trainee = await fetchJson("/api/trainees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });

    return root.AppLogic.normalizeTrainee(trainee);
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

  return {
    createTrainee,
    deleteTrainee,
    loadAdminState,
    loadMissionCountdown,
    loadRoadshow,
    loadTeams,
    loadTrainees,
    loadVoteResults,
    loginWithFeishu,
    saveSentence,
    updateAdminStage,
    startMissionCountdown,
    startRoadshowTimer,
    updateTrainee,
  };
});
