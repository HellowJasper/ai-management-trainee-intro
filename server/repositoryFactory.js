const { createMysqlPool } = require("./mysqlClient");
const { createMysqlAuditLogRepository } = require("./mysqlAuditLogRepository");
const { createMysqlAdminStateRepository } = require("./mysqlAdminStateRepository");
const { createMysqlJudgeScoresRepository } = require("./mysqlJudgeScoresRepository");
const { createMysqlMissionCountdownRepository } = require("./mysqlMissionCountdownRepository");
const { createMysqlRoadshowRepository } = require("./mysqlRoadshowRepository");
const { createMysqlResultSnapshotsRepository } = require("./mysqlResultSnapshotsRepository");
const { createMysqlTeamRepository } = require("./mysqlTeamRepository");
const { createMysqlTraineeRepository } = require("./mysqlTraineeRepository");
const { createMysqlUserRoleRepository } = require("./mysqlUserRoleRepository");
const { createMysqlVoteResultsRepository } = require("./mysqlVoteResultsRepository");
const { createMysqlWorksRepository } = require("./mysqlWorksRepository");
const { createMysqlAuthSessionRepository } = require("./mysqlAuthSessionRepository");
const { createMysqlOAuthStateRepository } = require("./mysqlOAuthStateRepository");
const { createAuditLogRepository } = require("./auditLogRepository");
const { createAdminStateRepository } = require("./adminStateRepository");
const { createJudgeScoresRepository } = require("./judgeScoresRepository");
const { createMissionCountdownRepository } = require("./missionCountdownRepository");
const { createPrestartCountdownRepository } = require("./prestartCountdownRepository");
const { createRoadshowRepository } = require("./roadshowRepository");
const { createResultSnapshotRepository } = require("./resultSnapshotRepository");
const { createTeamRepository } = require("./teamRepository");
const { createTraineeRepository } = require("./traineeRepository");
const { createUserRoleRepository } = require("./userRoleRepository");
const { createVoteResultsRepository } = require("./voteResultsRepository");
const { createWorksRepository } = require("./worksRepository");

function normalizeDataBackend(value) {
  return String(value || "json").trim().toLowerCase();
}

function createRepositoryBundle({
  dataBackend = process.env.DATA_BACKEND,
  mysqlPool,
} = {}) {
  const backend = normalizeDataBackend(dataBackend);

  if (backend === "mysql") {
    const pool = mysqlPool || createMysqlPool();
    return {
      dataBackend: "mysql",
      repository: createMysqlTraineeRepository(pool),
      teamRepository: createMysqlTeamRepository(pool),
      voteResultsRepository: createMysqlVoteResultsRepository(pool),
      judgeScoresRepository: createMysqlJudgeScoresRepository(pool),
      worksRepository: createMysqlWorksRepository(pool),
      auditLogRepository: createMysqlAuditLogRepository(pool),
      missionCountdownRepository: createMysqlMissionCountdownRepository(pool),
      prestartCountdownRepository: createMysqlMissionCountdownRepository(pool, {
        id: "prestart",
        defaultDurationMs: 24 * 60 * 60 * 1000,
        label: "Prestart countdown",
      }),
      roadshowRepository: createMysqlRoadshowRepository(pool),
      adminStateRepository: createMysqlAdminStateRepository(pool),
      resultSnapshotRepository: createMysqlResultSnapshotsRepository(pool),
      userRoleRepository: createMysqlUserRoleRepository(pool),
      authSessionRepository: createMysqlAuthSessionRepository(pool),
      oauthStateRepository: createMysqlOAuthStateRepository(pool),
      mysqlPool: pool,
    };
  }

  return {
    dataBackend: "json",
    repository: createTraineeRepository(),
    teamRepository: createTeamRepository(),
    voteResultsRepository: createVoteResultsRepository(),
    judgeScoresRepository: createJudgeScoresRepository(),
    worksRepository: createWorksRepository(),
    auditLogRepository: createAuditLogRepository(),
    missionCountdownRepository: createMissionCountdownRepository(),
    prestartCountdownRepository: createPrestartCountdownRepository(),
    roadshowRepository: createRoadshowRepository(),
    adminStateRepository: createAdminStateRepository(),
    resultSnapshotRepository: createResultSnapshotRepository(),
    userRoleRepository: createUserRoleRepository(),
  };
}

module.exports = {
  createRepositoryBundle,
};
