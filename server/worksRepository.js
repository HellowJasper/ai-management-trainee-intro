const fs = require("node:fs/promises");
const path = require("node:path");
const { createHttpError } = require("./traineeRepository");

const DEFAULT_DATA_PATH = path.join(__dirname, "../data/works.json");
const ALLOWED_STATUSES = new Set(["draft", "submitted", "reviewing", "published", "rejected"]);

function normalizeId(value) {
  return String(value || "").trim();
}

function splitTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[、,，/|;\n]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeWork(work = {}) {
  const teamId = normalizeId(work.teamId || work.id);

  return {
    id: normalizeId(work.id || teamId),
    teamId,
    teamName: String(work.teamName || work.name || "").trim(),
    project: String(work.project || work.title || "").trim(),
    pitch: String(work.pitch || work.description || "").trim(),
    stack: splitTags(work.stack),
    demoUrl: String(work.demoUrl || "").trim(),
    codeUrl: String(work.codeUrl || "").trim(),
    docUrl: String(work.docUrl || "").trim(),
    screenshots: splitTags(work.screenshots),
    status: ALLOWED_STATUSES.has(work.status) ? work.status : "draft",
    submittedBy: String(work.submittedBy || work.userId || "").trim(),
    submittedAt: work.submittedAt || null,
    submittedBy: String(work.submittedBy || "").trim(),
    reviewedAt: work.reviewedAt || null,
    reviewedBy: String(work.reviewedBy || "").trim(),
    reviewNote: String(work.reviewNote || "").trim(),
    updatedAt: work.updatedAt || new Date().toISOString(),
  };
}

function normalizeState(payload = {}) {
  const works = Array.isArray(payload) ? payload : payload.works;

  return {
    works: Array.isArray(works) ? works.map(normalizeWork).filter((work) => work.id && work.teamId) : [],
  };
}

function createWorksRepository(dataPath = DEFAULT_DATA_PATH) {
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

  async function listWorks({ status } = {}) {
    const state = await readState();
    const cleanStatus = normalizeId(status);

    return cleanStatus
      ? state.works.filter((work) => work.status === cleanStatus)
      : state.works;
  }

  async function getWork(teamId) {
    const cleanTeamId = normalizeId(teamId);
    const state = await readState();
    const work = state.works.find((item) => item.id === cleanTeamId || item.teamId === cleanTeamId);

    if (!work) {
      throw createHttpError(404, `Work ${cleanTeamId} was not found.`);
    }

    return work;
  }

  async function submitWork(payload = {}) {
    const teamId = normalizeId(payload.teamId || payload.id);
    if (!teamId) {
      throw createHttpError(400, "teamId is required.");
    }

    const project = String(payload.project || payload.title || "").trim();
    if (!project) {
      throw createHttpError(400, "project is required.");
    }

    const state = await readState();
    const updatedAt = new Date().toISOString();
    const work = normalizeWork({
      ...payload,
      id: teamId,
      teamId,
      status: "submitted",
      submittedAt: payload.submittedAt || updatedAt,
      updatedAt,
    });
    const nextWorks = state.works.filter((item) => item.id !== work.id);

    nextWorks.push(work);
    await writeState({ works: nextWorks });

    return {
      accepted: true,
      work,
    };
  }

  async function withdrawWork(payload = {}) {
    const teamId = normalizeId(payload.teamId || payload.id);
    if (!teamId) {
      throw createHttpError(400, "teamId is required.");
    }

    const state = await readState();
    const index = state.works.findIndex((work) => work.id === teamId || work.teamId === teamId);
    if (index === -1) {
      throw createHttpError(404, `Work ${teamId} was not found.`);
    }

    const withdrawnAt = new Date().toISOString();
    const work = normalizeWork({
      ...state.works[index],
      status: "draft",
      submittedAt: null,
      reviewedAt: null,
      reviewedBy: "",
      reviewNote: "",
      updatedAt: withdrawnAt,
    });
    const nextWorks = [...state.works];
    nextWorks[index] = work;

    await writeState({ works: nextWorks });

    return {
      accepted: true,
      work,
    };
  }

  async function updateStatus(teamId, payload = {}) {
    const cleanTeamId = normalizeId(teamId);
    const status = normalizeId(payload.status);

    if (!cleanTeamId) {
      throw createHttpError(400, "teamId is required.");
    }
    if (!ALLOWED_STATUSES.has(status)) {
      throw createHttpError(400, `Unknown work status: ${status || "(empty)"}.`);
    }

    const state = await readState();
    const index = state.works.findIndex((work) => work.id === cleanTeamId || work.teamId === cleanTeamId);
    if (index === -1) {
      throw createHttpError(404, `Work ${cleanTeamId} was not found.`);
    }

    const reviewedAt = new Date().toISOString();
    const work = normalizeWork({
      ...state.works[index],
      status,
      reviewedAt,
      reviewedBy: payload.reviewerId || payload.actor || state.works[index].reviewedBy || "admin",
      reviewNote: payload.reviewNote || state.works[index].reviewNote || "",
      updatedAt: reviewedAt,
    });
    const nextWorks = [...state.works];
    nextWorks[index] = work;

    await writeState({ works: nextWorks });

    return {
      accepted: true,
      work,
    };
  }

  return {
    getWork,
    listWorks,
    submitWork,
    withdrawWork,
    updateStatus,
  };
}

module.exports = {
  createWorksRepository,
};
