const { createHttpError } = require("./traineeRepository");

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

function parseProfileJson(value) {
  if (Buffer.isBuffer(value)) {
    return JSON.parse(value.toString("utf8"));
  }
  if (typeof value === "string") {
    return JSON.parse(value);
  }
  if (value && typeof value === "object") {
    return value;
  }
  return {};
}

function rowToTrainee(row = {}) {
  const trainee = parseProfileJson(row.profile_json || row.profileJson || row.profile);
  return {
    ...trainee,
    id: normalizeId(trainee.id || row.id),
  };
}

function serializeProfile(trainee) {
  return JSON.stringify(trainee || {});
}

function extractColumns(trainee) {
  return {
    id: normalizeId(trainee.id),
    name: String(trainee.name || "").trim(),
    romanName: String(trainee.romanName || "").trim(),
    department: String(trainee.department || "").trim(),
    departmentEn: String(trainee.departmentEn || "").trim(),
    sentence: String(trainee.sentence || "").trim(),
    profileJson: serializeProfile(trainee),
  };
}

function createMysqlTraineeRepository(pool) {
  if (!pool || typeof pool.execute !== "function") {
    throw new Error("A mysql2-compatible pool with execute(sql, params) is required.");
  }

  async function listTrainees() {
    const [rows] = await pool.execute(
      "SELECT profile_json FROM trainees ORDER BY sort_order ASC, id ASC",
    );
    return rows.map(rowToTrainee);
  }

  async function findTrainee(id) {
    const cleanId = normalizeId(id);
    const [rows] = await pool.execute(
      "SELECT profile_json FROM trainees WHERE id = ? LIMIT 1",
      [cleanId],
    );
    return rows[0] ? rowToTrainee(rows[0]) : null;
  }

  async function getTrainee(id) {
    const cleanId = normalizeId(id);
    const trainee = await findTrainee(cleanId);

    if (!trainee) {
      throw createHttpError(404, `Trainee ${cleanId} was not found.`);
    }

    return trainee;
  }

  async function createTrainee(trainee) {
    const cleanId = normalizeId(trainee?.id);
    if (!cleanId) {
      throw createHttpError(400, "Trainee id is required.");
    }

    const [existingRows] = await pool.execute(
      "SELECT id FROM trainees WHERE id = ? LIMIT 1",
      [cleanId],
    );
    if (existingRows.length) {
      throw createHttpError(409, `Trainee ${cleanId} already exists.`);
    }

    const nextTrainee = {
      ...trainee,
      id: cleanId,
    };
    const columns = extractColumns(nextTrainee);
    await pool.execute(
      `INSERT INTO trainees
        (id, name, roman_name, department, department_en, sentence, profile_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        columns.id,
        columns.name,
        columns.romanName,
        columns.department,
        columns.departmentEn,
        columns.sentence,
        columns.profileJson,
      ],
    );

    return nextTrainee;
  }

  async function updateTrainee(id, payload) {
    const cleanId = normalizeId(id);
    const existing = await getTrainee(cleanId);
    const patch = pickAllowedFields(payload);
    const updatedTrainee = {
      ...existing,
      ...patch,
      id: cleanId,
    };
    const columns = extractColumns(updatedTrainee);
    const [result] = await pool.execute(
      `UPDATE trainees SET
        name = ?,
        roman_name = ?,
        department = ?,
        department_en = ?,
        sentence = ?,
        profile_json = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        columns.name,
        columns.romanName,
        columns.department,
        columns.departmentEn,
        columns.sentence,
        columns.profileJson,
        cleanId,
      ],
    );

    if (result.affectedRows === 0) {
      throw createHttpError(404, `Trainee ${cleanId} was not found.`);
    }

    return updatedTrainee;
  }

  async function saveSentence(id, sentence) {
    return updateTrainee(id, {
      sentence: String(sentence || "").trim(),
    });
  }

  async function deleteTrainee(id) {
    const cleanId = normalizeId(id);
    const [result] = await pool.execute(
      "DELETE FROM trainees WHERE id = ?",
      [cleanId],
    );

    if (result.affectedRows === 0) {
      throw createHttpError(404, `Trainee ${cleanId} was not found.`);
    }

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
  createMysqlTraineeRepository,
};
