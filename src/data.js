(function attachDataLoader(root, factory) {
  const api = factory(root);
  root.AppApi = api;
  root.AppData = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createDataLoader(root) {
  const FEISHU_LOGIN_REDIRECT = "./site.html#home";

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
    loadTeams,
    loadTrainees,
    loginWithFeishu,
    saveSentence,
    updateAdminStage,
    updateTrainee,
  };
});
