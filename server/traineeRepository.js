const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_DATA_PATH = path.join(__dirname, "../data/trainees.json");

const ALLOWED_UPDATE_FIELDS = new Set([
  "department",
  "departmentEn",
  "name",
  "romanName",
  "background",
  "aiPartners",
  "favoriteAI",
  "aiProblem",
  "aiPower",
  "funFact",
  "photo",
  "memeImage",
  "memeText",
  "portrait",
  "idPhoto",
  "sentence",
  "previousPairs",
]);

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeId(id) {
  return String(id || "").trim();
}

function pickAllowedFields(payload) {
  const patch = {};

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (ALLOWED_UPDATE_FIELDS.has(key)) {
      patch[key] = value;
    }
  });

  return patch;
}

function validateTraineeForCreate(trainee, existingTrainees) {
  const id = normalizeId(trainee?.id);
  if (!id) {
    throw createHttpError(400, "Trainee id is required.");
  }
  if (existingTrainees.some((item) => item.id === id)) {
    throw createHttpError(409, `Trainee ${id} already exists.`);
  }

  return {
    ...trainee,
    id,
  };
}

function createTraineeRepository(dataPath = DEFAULT_DATA_PATH) {
  const resolvedDataPath = path.resolve(dataPath);

  async function readTrainees() {
    const raw = await fs.readFile(resolvedDataPath, "utf8");
    const trainees = JSON.parse(raw);

    if (!Array.isArray(trainees)) {
      throw createHttpError(500, "Trainee data must be an array.");
    }

    return trainees;
  }

  async function writeTrainees(trainees) {
    await fs.writeFile(resolvedDataPath, `${JSON.stringify(trainees, null, 2)}\n`);
  }

  async function listTrainees() {
    return readTrainees();
  }

  async function getTrainee(id) {
    const cleanId = normalizeId(id);
    const trainees = await readTrainees();
    const trainee = trainees.find((item) => item.id === cleanId);

    if (!trainee) {
      throw createHttpError(404, `Trainee ${cleanId} was not found.`);
    }

    return trainee;
  }

  async function createTrainee(trainee) {
    const trainees = await readTrainees();
    const newTrainee = validateTraineeForCreate(trainee, trainees);
    const nextTrainees = [...trainees, newTrainee];

    await writeTrainees(nextTrainees);
    return newTrainee;
  }

  async function updateTrainee(id, payload) {
    const cleanId = normalizeId(id);
    const trainees = await readTrainees();
    const index = trainees.findIndex((item) => item.id === cleanId);

    if (index === -1) {
      throw createHttpError(404, `Trainee ${cleanId} was not found.`);
    }

    const patch = pickAllowedFields(payload);
    const updatedTrainee = {
      ...trainees[index],
      ...patch,
      id: cleanId,
    };
    const nextTrainees = [...trainees];
    nextTrainees[index] = updatedTrainee;

    await writeTrainees(nextTrainees);
    return updatedTrainee;
  }

  async function saveSentence(id, sentence) {
    return updateTrainee(id, {
      sentence: String(sentence || "").trim(),
    });
  }

  async function deleteTrainee(id) {
    const cleanId = normalizeId(id);
    const trainees = await readTrainees();
    const nextTrainees = trainees.filter((item) => item.id !== cleanId);

    if (nextTrainees.length === trainees.length) {
      throw createHttpError(404, `Trainee ${cleanId} was not found.`);
    }

    await writeTrainees(nextTrainees);
    return { id: cleanId };
  }

  return {
    createTrainee,
    deleteTrainee,
    getTrainee,
    listTrainees,
    saveSentence,
    updateTrainee,
  };
}

module.exports = {
  createHttpError,
  createTraineeRepository,
};
