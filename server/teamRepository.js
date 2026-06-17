const fs = require("node:fs/promises");
const path = require("node:path");
const { createHttpError } = require("./traineeRepository");

const DEFAULT_DATA_PATH = path.join(__dirname, "../data/teams.json");

function createTeamRepository(dataPath = DEFAULT_DATA_PATH) {
  const resolvedDataPath = path.resolve(dataPath);

  async function readTeams() {
    const raw = await fs.readFile(resolvedDataPath, "utf8");
    const teams = JSON.parse(raw);

    if (!Array.isArray(teams)) {
      throw createHttpError(500, "Team data must be an array.");
    }

    return teams;
  }

  async function listTeams() {
    return readTeams();
  }

  return {
    listTeams,
  };
}

module.exports = {
  createTeamRepository,
};
