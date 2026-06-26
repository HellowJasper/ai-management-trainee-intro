const { getRolePermissions } = require("../src/logic");

function normalizeArrayPayload(payload, key) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload[key])) {
    return payload[key];
  }
  return [];
}

function normalizeVoters(voters) {
  if (Array.isArray(voters)) {
    return voters.reduce((state, item = {}) => {
      const voterId = String(item.voterId || item.userId || item.id || "").trim();
      const teamId = String(item.teamId || item.voteTeamId || item.votedTeamId || "").trim();
      if (voterId && teamId) {
        state[voterId] = teamId;
      }
      return state;
    }, {});
  }
  return voters && typeof voters === "object" ? { ...voters } : {};
}

function normalizeSession(session) {
  if (!session) {
    return {
      authenticated: false,
      user: null,
      role: "public",
      roles: ["public"],
      permissions: getRolePermissions("public"),
      source: "anonymous-public",
    };
  }

  const role = session.role || "";
  const roles = Array.isArray(session.roles) && session.roles.length ? session.roles : (role ? [role] : []);
  const permissions = role
    ? (session.permissions && Object.keys(session.permissions).length ? session.permissions : getRolePermissions(role))
    : {};
  return {
    authenticated: true,
    user: session.user || null,
    role: role || null,
    roles,
    permissions,
    source: session.source || "session",
  };
}

function normalizeVoteState(voteState = {}, userId = "") {
  const voters = normalizeVoters(voteState.voters);
  const cleanUserId = String(userId || "").trim();
  const myVoteTeamId = cleanUserId && voters[cleanUserId] ? voters[cleanUserId] : null;
  const status = String(voteState.status || "closed").trim() || "closed";

  return {
    status,
    windowLabel: String(voteState.windowLabel || "").trim(),
    pointScale: Array.isArray(voteState.pointScale) ? voteState.pointScale : [],
    updatedAt: voteState.updatedAt || null,
    results: Array.isArray(voteState.results) ? voteState.results : [],
    myVoteTeamId,
    votersCount: Object.keys(voters).length,
  };
}

function findJoinedTeamId(teams = [], userId = "") {
  const cleanUserId = String(userId || "").trim();
  if (!cleanUserId) {
    return null;
  }
  const team = teams.find((item = {}) => [item.advisor, ...(item.members || [])].some((member = {}) => (
    String(member?.userId || member?.id || "").trim() === cleanUserId
  )));
  return team ? team.id : null;
}

function isAdminSession(me = {}) {
  return Boolean(me?.permissions?.canAdmin) || me.role === "admin" || (me.roles || []).includes("admin");
}

function isPlayerSession(me = {}) {
  return Boolean(me?.permissions?.canSubmitWork) || me.role === "player" || (me.roles || []).includes("player");
}

function isPublishedWork(work = {}) {
  return String(work.status || "").trim() === "published";
}

function isOwnTeamWork(work = {}, teamId = "") {
  const cleanTeamId = String(teamId || "").trim();
  if (!cleanTeamId) {
    return false;
  }
  return [work.teamId, work.id].some((value) => String(value || "").trim() === cleanTeamId);
}

function filterVisibleWorks(works = [], me = {}) {
  if (isAdminSession(me)) {
    return works;
  }

  if (isPlayerSession(me) && me.teamId) {
    return works.filter((work) => isPublishedWork(work) || isOwnTeamWork(work, me.teamId));
  }

  return works.filter(isPublishedWork);
}

function normalizeStageState(adminState = {}) {
  const stages = normalizeArrayPayload(adminState?.stages, "stages");
  const currentStageId = String(adminState?.currentStageId || "").trim();
  const screenOverrideStageId = String(adminState?.screenOverrideStageId || "").trim();
  const currentStage = stages.find((stage) => stage?.id === currentStageId) || null;

  return {
    currentStageId,
    screenOverrideStageId,
    currentStage,
    stages,
    updatedAt: adminState?.updatedAt || null,
  };
}

function normalizeTimerState(timerState = {}) {
  return timerState && typeof timerState === "object" ? { ...timerState } : {};
}

async function readOptionalState(repository, methodName, fallback) {
  if (!repository || typeof repository[methodName] !== "function") {
    return fallback;
  }
  return repository[methodName]();
}

function createSiteStateService({
  repository,
  teamRepository,
  voteResultsRepository,
  worksRepository,
  resultSnapshotRepository,
  authSessionRepository,
  adminStateRepository,
  missionCountdownRepository,
  roadshowRepository,
} = {}) {
  if (!repository || typeof repository.listTrainees !== "function") {
    throw new Error("site state service requires a trainee repository.");
  }
  if (!teamRepository || typeof teamRepository.listTeams !== "function") {
    throw new Error("site state service requires a team repository.");
  }
  if (!voteResultsRepository || typeof voteResultsRepository.listVoteResults !== "function") {
    throw new Error("site state service requires a vote results repository.");
  }
  if (!worksRepository || typeof worksRepository.listWorks !== "function") {
    throw new Error("site state service requires a works repository.");
  }
  if (!resultSnapshotRepository || typeof resultSnapshotRepository.getLatestSnapshot !== "function") {
    throw new Error("site state service requires a result snapshot repository.");
  }
  if (!authSessionRepository || typeof authSessionRepository.getSession !== "function") {
    throw new Error("site state service requires an auth session repository.");
  }

  async function getBootstrapState({ sessionId } = {}) {
    const [session, trainees, teams, voteState, worksPayload, snapshot, adminState, missionCountdown, roadshow] = await Promise.all([
      authSessionRepository.getSession(sessionId),
      repository.listTrainees(),
      teamRepository.listTeams(),
      voteResultsRepository.listVoteResults(),
      worksRepository.listWorks(),
      resultSnapshotRepository.getLatestSnapshot(),
      readOptionalState(adminStateRepository, "getState", {}),
      readOptionalState(missionCountdownRepository, "getState", {}),
      readOptionalState(roadshowRepository, "getState", {}),
    ]);
    const normalizedTeams = normalizeArrayPayload(teams, "teams");
    const me = normalizeSession(session);
    me.teamId = findJoinedTeamId(normalizedTeams, me.user?.id);
    const works = normalizeArrayPayload(worksPayload, "works");
    const vote = normalizeVoteState(voteState, me.user?.id);
    const stage = normalizeStageState(adminState);

    return {
      me,
      stage: {
        ...stage,
        voteStatus: vote.status,
        voteWindowLabel: vote.windowLabel,
        pointScale: vote.pointScale,
        resultPublished: Boolean(snapshot),
      },
      timers: {
        missionCountdown: normalizeTimerState(missionCountdown),
        roadshow: normalizeTimerState(roadshow),
      },
      trainees: normalizeArrayPayload(trainees, "trainees"),
      teams: normalizedTeams,
      works: filterVisibleWorks(works, me),
      vote,
      result: {
        published: Boolean(snapshot),
        snapshot,
      },
    };
  }

  return {
    getBootstrapState,
  };
}

module.exports = {
  createSiteStateService,
  findJoinedTeamId,
  filterVisibleWorks,
};
