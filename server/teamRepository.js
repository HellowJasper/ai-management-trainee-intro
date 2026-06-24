const fs = require("node:fs/promises");
const path = require("node:path");
const { createHttpError } = require("./traineeRepository");

const DEFAULT_DATA_PATH = path.join(__dirname, "../data/teams.json");
const DEFAULT_TEAM_CAPACITY = 5;
const LOCKED_TEAM_STATUSES = new Set(["locked", "closed"]);
const WRITABLE_TEAM_STATUSES = new Set(["open", "locked"]);

function writeJsonFile(filePath, data) {
  return fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function normalizeUserId(payload = {}) {
  return String(payload.userId || payload.openId || payload.unionId || "local-player").trim();
}

function normalizeMember(payload = {}) {
  const userId = normalizeUserId(payload);
  if (!userId) {
    throw createHttpError(400, "userId is required.");
  }

  return {
    userId,
    name: String(payload.name || payload.displayName || "本地选手").trim(),
    department: String(payload.department || "").trim(),
    role: String(payload.role || payload.duty || "队友").trim(),
    photo: String(payload.photo || payload.avatar || "").trim(),
    roleKey: String(payload.roleKey || "").trim(),
    duty: String(payload.duty || payload.role || "").trim(),
    joinedAt: payload.joinedAt || new Date().toISOString(),
  };
}

function teamCapacity(team = {}) {
  const capacity = Number(team.capacity);
  return Number.isFinite(capacity) && capacity > 0 ? capacity : DEFAULT_TEAM_CAPACITY;
}

function normalizeTeamStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  if (!WRITABLE_TEAM_STATUSES.has(status)) {
    throw createHttpError(400, "status must be open or locked.");
  }

  return status;
}

function memberMatchesUser(member, userId) {
  return String(member?.userId || member?.id || member?.name || "").trim() === userId;
}

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

  async function writeTeams(teams) {
    await writeJsonFile(resolvedDataPath, teams);
  }

  async function joinTeam(payload = {}, options = {}) {
    const teamId = String(payload.teamId || "").trim();
    if (!teamId) {
      throw createHttpError(400, "teamId is required.");
    }

    const member = normalizeMember(payload);
    const teams = await readTeams();
    const targetIndex = teams.findIndex((team) => team.id === teamId);

    if (targetIndex === -1) {
      throw createHttpError(404, `Team ${teamId} was not found.`);
    }

    const nextTeams = teams.map((team) => ({
      ...team,
      members: Array.isArray(team.members)
        ? team.members.filter((item) => !memberMatchesUser(item, member.userId))
        : [],
    }));
    const target = {
      ...nextTeams[targetIndex],
      members: [...nextTeams[targetIndex].members],
    };

    if (!options.bypassStatus && LOCKED_TEAM_STATUSES.has(String(target.status || "open").trim().toLowerCase())) {
      throw createHttpError(409, `Team ${teamId} is locked.`);
    }

    if (target.members.length >= teamCapacity(target) - 1) {
      throw createHttpError(409, `Team ${teamId} is already full.`);
    }

    target.members.push(member);
    nextTeams[targetIndex] = target;

    await writeTeams(nextTeams);
    return {
      accepted: true,
      team: target,
      member,
      teams: nextTeams,
    };
  }

  async function leaveTeam(payload = {}) {
    const teamId = String(payload.teamId || "").trim();
    const userId = normalizeUserId(payload);
    if (!teamId) {
      throw createHttpError(400, "teamId is required.");
    }

    const teams = await readTeams();
    const targetIndex = teams.findIndex((team) => team.id === teamId);

    if (targetIndex === -1) {
      throw createHttpError(404, `Team ${teamId} was not found.`);
    }

    const target = teams[targetIndex];
    const members = Array.isArray(target.members) ? target.members : [];
    const nextMembers = members.filter((member) => !memberMatchesUser(member, userId));

    if (nextMembers.length === members.length) {
      throw createHttpError(404, `User ${userId} is not in team ${teamId}.`);
    }

    const nextTeams = [...teams];
    const nextTeam = {
      ...target,
      members: nextMembers,
    };
    nextTeams[targetIndex] = nextTeam;

    await writeTeams(nextTeams);
    return {
      accepted: true,
      team: nextTeam,
      userId,
      teams: nextTeams,
    };
  }

  async function claimRole(payload = {}) {
    const teamId = String(payload.teamId || "").trim();
    const roleKey = String(payload.roleKey || "").trim();
    const duty = String(payload.duty || payload.role || "").trim();
    const userId = normalizeUserId(payload);

    if (!teamId) {
      throw createHttpError(400, "teamId is required.");
    }
    if (!roleKey) {
      throw createHttpError(400, "roleKey is required.");
    }

    const teams = await readTeams();
    const targetIndex = teams.findIndex((team) => team.id === teamId);
    if (targetIndex === -1) {
      throw createHttpError(404, `Team ${teamId} was not found.`);
    }

    const target = teams[targetIndex];
    const members = Array.isArray(target.members) ? [...target.members] : [];
    const memberIndex = members.findIndex((member) => memberMatchesUser(member, userId));

    if (memberIndex === -1) {
      throw createHttpError(404, `User ${userId} is not in team ${teamId}.`);
    }

    const member = {
      ...members[memberIndex],
      roleKey,
      duty: duty || members[memberIndex].duty || members[memberIndex].role || "",
      role: duty || members[memberIndex].role || roleKey,
      updatedAt: new Date().toISOString(),
    };
    members[memberIndex] = member;

    const nextTeams = [...teams];
    const nextTeam = {
      ...target,
      members,
    };
    nextTeams[targetIndex] = nextTeam;

    await writeTeams(nextTeams);
    return {
      accepted: true,
      team: nextTeam,
      member,
      teams: nextTeams,
    };
  }

  async function updateTeamStatus(teamId, payload = {}) {
    const cleanTeamId = String(teamId || payload.teamId || "").trim();
    if (!cleanTeamId) {
      throw createHttpError(400, "teamId is required.");
    }

    const status = normalizeTeamStatus(payload.status);
    const teams = await readTeams();
    const targetIndex = teams.findIndex((team) => team.id === cleanTeamId);

    if (targetIndex === -1) {
      throw createHttpError(404, `Team ${cleanTeamId} was not found.`);
    }

    const nextTeams = [...teams];
    const nextTeam = {
      ...teams[targetIndex],
      status,
      updatedAt: new Date().toISOString(),
    };
    nextTeams[targetIndex] = nextTeam;

    await writeTeams(nextTeams);
    return {
      accepted: true,
      team: nextTeam,
      teams: nextTeams,
    };
  }

  return {
    claimRole,
    joinTeam,
    leaveTeam,
    listTeams,
    updateTeamStatus,
  };
}

module.exports = {
  createTeamRepository,
};
