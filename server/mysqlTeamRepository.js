const { normalizeTeamScenarioPayload } = require("./teamRepository");
const { createHttpError } = require("./traineeRepository");

const DEFAULT_TEAM_CAPACITY = 5;
const LOCKED_TEAM_STATUSES = new Set(["locked", "closed"]);
const WRITABLE_TEAM_STATUSES = new Set(["open", "locked"]);

function normalizeUserId(payload = {}) {
  return String(payload.userId || payload.openId || payload.unionId || "local-player").trim();
}

function normalizeId(value) {
  return String(value || "").trim();
}

function parseJsonValue(value) {
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

function normalizeDate(value) {
  if (!value) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
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
    photo: String(payload.photo || payload.avatar || payload.idPhoto || "").trim(),
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

function isTeamLocked(team = {}) {
  return LOCKED_TEAM_STATUSES.has(String(team.status || "open").trim().toLowerCase());
}

function assertTeamWritable(team = {}, teamId = "", options = {}) {
  if (!options.bypassStatus && isTeamLocked(team)) {
    throw createHttpError(409, `Team ${teamId} is locked.`);
  }
}

function memberMatchesUser(member, userId) {
  return String(member?.userId || member?.id || member?.name || "").trim() === userId;
}

function roleMatches(member = {}, roleKey = "") {
  const cleanRoleKey = String(roleKey || "").trim();
  const memberRoleKey = String(member.roleKey || "").trim();
  if (memberRoleKey === cleanRoleKey) {
    return true;
  }
  if (cleanRoleKey === "advisor") {
    return /队长|leader|captain|advisor/i.test(`${member.role || ""} ${member.duty || ""}`);
  }
  return false;
}

function isAdvisorMember(member = {}) {
  return roleMatches(member, "advisor");
}

function rowToTeam(row = {}) {
  const meta = parseJsonValue(row.meta_json || row.metaJson || row.meta);
  return {
    ...meta,
    id: normalizeId(row.id || meta.id),
    index: normalizeId(meta.index || row.track_code || row.trackCode),
    name: String(row.name || meta.name || "").trim(),
    nameEn: String(meta.nameEn || row.track_name || row.trackName || "").trim(),
    project: String(row.project || meta.project || "").trim(),
    status: String(row.status || meta.status || "open").trim(),
    capacity: Number(row.capacity || meta.capacity || DEFAULT_TEAM_CAPACITY),
  };
}

function rowToMember(row = {}) {
  return {
    userId: normalizeId(row.user_id || row.userId),
    name: String(row.name || "").trim(),
    department: String(row.department || "").trim(),
    role: String(row.role || row.duty || "队友").trim(),
    photo: String(row.photo || row.photo_url || row.photoUrl || "").trim(),
    roleKey: String(row.role_key || row.roleKey || "").trim(),
    duty: String(row.duty || row.role || "").trim(),
    joinedAt: normalizeDate(row.joined_at || row.joinedAt),
  };
}

function createMysqlTeamRepository(pool) {
  if (!pool || typeof pool.execute !== "function") {
    throw new Error("A mysql2-compatible pool with execute(sql, params) is required.");
  }

  async function listTeams() {
    const [teamRows] = await pool.execute(
      `SELECT id, name, track_code, track_name, project, status, capacity, sort_order, meta_json
       FROM teams
       ORDER BY sort_order ASC, id ASC`,
    );
    const [memberRows] = await pool.execute(
      `SELECT team_id, user_id, name, department, role_key, duty, photo_url AS photo, role, is_advisor, joined_at
       FROM team_members
       ORDER BY joined_at ASC, id ASC`,
    );

    const membersByTeam = new Map();
    const advisorByTeam = new Map();
    memberRows.forEach((row) => {
      const teamId = normalizeId(row.team_id || row.teamId);
      if (row.is_advisor) {
        advisorByTeam.set(teamId, rowToMember(row));
        return;
      }
      if (!membersByTeam.has(teamId)) {
        membersByTeam.set(teamId, []);
      }
      membersByTeam.get(teamId).push(rowToMember(row));
    });

    return teamRows.map((row) => {
      const team = rowToTeam(row);
      return {
        ...team,
        advisor: advisorByTeam.get(team.id) || null,
        members: membersByTeam.get(team.id) || [],
      };
    });
  }

  async function ensureTeamExists(teamId) {
    const [rows] = await pool.execute(
      "SELECT id FROM teams WHERE id = ? LIMIT 1",
      [teamId],
    );
    if (!rows.length) {
      throw createHttpError(404, `Team ${teamId} was not found.`);
    }
  }

  async function findTeamFromList(teamId, teams = null) {
    const allTeams = teams || await listTeams();
    const target = allTeams.find((team) => team.id === teamId);
    if (!target) {
      throw createHttpError(404, `Team ${teamId} was not found.`);
    }
    return { target, teams: allTeams };
  }

  async function joinTeam(payload = {}, options = {}) {
    const teamId = normalizeId(payload.teamId);
    if (!teamId) {
      throw createHttpError(400, "teamId is required.");
    }

    const member = normalizeMember(payload);
    const teams = await listTeams();
    const { target } = await findTeamFromList(teamId, teams);
    const targetMembersAfterMove = target.members.filter((item) => !memberMatchesUser(item, member.userId));

    assertTeamWritable(target, teamId, options);

    if (isAdvisorMember(member)) {
      await pool.execute(
        "DELETE FROM team_members WHERE user_id = ? AND is_advisor = FALSE",
        [member.userId],
      );
      await pool.execute(
        "DELETE FROM team_members WHERE team_id = ? AND is_advisor = TRUE",
        [teamId],
      );
      await pool.execute(
        `INSERT INTO team_members
          (team_id, user_id, name, department, role_key, duty, photo_url, role, is_advisor)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          teamId,
          member.userId,
          member.name,
          member.department,
          "advisor",
          member.duty || "队长",
          member.photo,
          member.role || member.duty || "队长",
          true,
        ],
      );

      const nextTeams = await listTeams();
      const nextTeam = nextTeams.find((team) => team.id === teamId);
      return {
        accepted: true,
        team: nextTeam,
        member: nextTeam?.advisor || member,
        teams: nextTeams,
      };
    }

    if (targetMembersAfterMove.length >= teamCapacity(target) - 1) {
      throw createHttpError(409, `Team ${teamId} is already full.`);
    }

    await pool.execute(
      "DELETE FROM team_members WHERE user_id = ? AND is_advisor = FALSE",
      [member.userId],
    );
    await pool.execute(
      `INSERT INTO team_members
        (team_id, user_id, name, department, role_key, duty, photo_url, role, is_advisor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
      [
        teamId,
        member.userId,
        member.name,
        member.department,
        member.roleKey || null,
        member.duty,
        member.photo,
        member.role,
        false,
      ],
    );

    const nextTeams = await listTeams();
    const nextTeam = nextTeams.find((team) => team.id === teamId);
    return {
      accepted: true,
      team: nextTeam,
      member,
      teams: nextTeams,
    };
  }

  async function leaveTeam(payload = {}, options = {}) {
    const teamId = normalizeId(payload.teamId);
    const userId = normalizeUserId(payload);
    if (!teamId) {
      throw createHttpError(400, "teamId is required.");
    }

    const { target } = await findTeamFromList(teamId);
    assertTeamWritable(target, teamId, options);

    const wantsAdvisor = isAdvisorMember(payload);
    const [result] = await pool.execute(
      wantsAdvisor
        ? "DELETE FROM team_members WHERE team_id = ? AND user_id = ? AND is_advisor = TRUE"
        : "DELETE FROM team_members WHERE team_id = ? AND user_id = ? AND is_advisor = FALSE",
      [teamId, userId],
    );

    if (result.affectedRows === 0) {
      throw createHttpError(404, `User ${userId} is not in team ${teamId}.`);
    }

    const nextTeams = await listTeams();
    return {
      accepted: true,
      team: nextTeams.find((team) => team.id === teamId),
      userId,
      teams: nextTeams,
    };
  }

  async function claimRole(payload = {}, options = {}) {
    const teamId = normalizeId(payload.teamId);
    const roleKey = normalizeId(payload.roleKey);
    const duty = String(payload.duty || payload.role || "").trim();
    const userId = normalizeUserId(payload);

    if (!teamId) {
      throw createHttpError(400, "teamId is required.");
    }
    if (!roleKey) {
      throw createHttpError(400, "roleKey is required.");
    }

    const teams = await listTeams();
    const { target } = await findTeamFromList(teamId, teams);
    assertTeamWritable(target, teamId, options);

    const member = target.members.find((item) => memberMatchesUser(item, userId));
    if (!member) {
      throw createHttpError(404, `User ${userId} is not in team ${teamId}.`);
    }
    const occupied = target.members.find((item) => item.userId !== userId && item.roleKey === roleKey);
    if (occupied) {
      throw createHttpError(409, `Role ${roleKey} is already claimed in team ${teamId}.`);
    }

    const nextDuty = duty || member.duty || member.role || "";
    const nextRole = nextDuty || member.role || roleKey;
    const [result] = await pool.execute(
      `UPDATE team_members SET
        role_key = ?,
        duty = ?,
        role = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE team_id = ? AND user_id = ? AND is_advisor = FALSE`,
      [roleKey, nextDuty, nextRole, teamId, userId],
    );

    if (result.affectedRows === 0) {
      throw createHttpError(404, `User ${userId} is not in team ${teamId}.`);
    }

    const nextTeams = await listTeams();
    const nextTeam = nextTeams.find((team) => team.id === teamId);
    const nextMember = nextTeam.members.find((item) => memberMatchesUser(item, userId));
    return {
      accepted: true,
      team: nextTeam,
      member: nextMember,
      teams: nextTeams,
    };
  }

  async function updateTeamStatus(teamId, payload = {}) {
    const cleanTeamId = normalizeId(teamId || payload.teamId);
    if (!cleanTeamId) {
      throw createHttpError(400, "teamId is required.");
    }

    const status = normalizeTeamStatus(payload.status);
    await ensureTeamExists(cleanTeamId);

    await pool.execute(
      "UPDATE teams SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [status, cleanTeamId],
    );

    const nextTeams = await listTeams();
    return {
      accepted: true,
      team: nextTeams.find((team) => team.id === cleanTeamId),
      teams: nextTeams,
    };
  }

  async function updateTeamScenario(teamId, payload = {}) {
    const cleanTeamId = normalizeId(teamId || payload.teamId);
    if (!cleanTeamId) {
      throw createHttpError(400, "teamId is required.");
    }

    const { target } = await findTeamFromList(cleanTeamId);
    const nextTeam = normalizeTeamScenarioPayload(payload, target);
    const meta = {
      ...nextTeam,
      advisor: undefined,
      members: undefined,
    };

    await pool.execute(
      `UPDATE teams SET
        name = ?,
        track_name = ?,
        meta_json = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        nextTeam.name || target.name || cleanTeamId,
        nextTeam.nameEn || target.nameEn || "",
        JSON.stringify(meta),
        cleanTeamId,
      ],
    );

    const nextTeams = await listTeams();
    return {
      accepted: true,
      team: nextTeams.find((team) => team.id === cleanTeamId),
      teams: nextTeams,
    };
  }

  return {
    claimRole,
    joinTeam,
    leaveTeam,
    listTeams,
    updateTeamScenario,
    updateTeamStatus,
  };
}

module.exports = {
  createMysqlTeamRepository,
};
