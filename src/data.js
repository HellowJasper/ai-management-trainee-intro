(function attachDataLoader(root, factory) {
  const api = factory(root);
  root.AppApi = api;
  root.AppData = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createDataLoader(root) {
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
    saveSentence,
    updateAdminStage,
    updateTrainee,
  };
});
