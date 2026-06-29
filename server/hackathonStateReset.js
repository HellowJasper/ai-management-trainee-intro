const fs = require("node:fs/promises");
const path = require("node:path");
const { DEFAULT_ADMIN_STAGES } = require("./adminStateRepository");

const DEFAULT_POINT_SCALE = [100, 85, 70, 55, 40];
const MISSION_DURATION_MS = 36 * 60 * 60 * 1000;
const ROADSHOW_DURATION_MS = 15 * 60 * 1000;

const PRESERVED_TABLES = [
  "trainees",
  "users",
  "role_assignments",
  "teams",
];

const CLEARED_TABLES = [
  "team_members",
  "works",
  "votes",
  "judge_scores",
  "result_snapshots",
  "auth_sessions",
  "oauth_states",
  "audit_logs",
  "bigscreen_state",
];

const STATE_TABLES = [
  "vote_windows",
  "event_stages",
  "mission_countdowns",
  "roadshow_sessions",
];

const BACKUP_TABLES = [
  ...PRESERVED_TABLES,
  ...CLEARED_TABLES,
  ...STATE_TABLES,
];

function ensureMysqlPool(pool) {
  if (!pool || typeof pool.execute !== "function") {
    throw new Error("A mysql2-compatible pool with execute(sql, params) is required.");
  }
}

function safeTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function countFiles(targetPath) {
  if (!(await pathExists(targetPath))) {
    return 0;
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    const entryPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      count += await countFiles(entryPath);
    } else if (entry.isFile()) {
      count += 1;
    }
  }
  return count;
}

async function copyDirectoryIfExists(sourcePath, targetPath) {
  if (!(await pathExists(sourcePath))) {
    return false;
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.cp(sourcePath, targetPath, { recursive: true });
  return true;
}

async function collectTableCounts(pool) {
  const counts = {};
  for (const table of BACKUP_TABLES) {
    const [rows] = await pool.execute(`SELECT COUNT(*) AS count FROM ${table}`);
    counts[table] = Number(rows?.[0]?.count || 0);
  }
  return counts;
}

async function backupMysqlTables(pool, backupDir) {
  const mysqlBackupDir = path.join(backupDir, "mysql");
  await fs.mkdir(mysqlBackupDir, { recursive: true });

  for (const table of BACKUP_TABLES) {
    const [rows] = await pool.execute(`SELECT * FROM ${table}`);
    await fs.writeFile(
      path.join(mysqlBackupDir, `${table}.json`),
      `${JSON.stringify(rows, null, 2)}\n`,
    );
  }
}

async function backupWorkUploads({ publicRoot, backupDir }) {
  const workUploadsPath = path.join(publicRoot, "assets", "uploads", "works");
  const backupWorkUploadsPath = path.join(backupDir, "assets", "uploads", "works");
  return copyDirectoryIfExists(workUploadsPath, backupWorkUploadsPath);
}

async function withTransaction(pool, operation) {
  if (typeof pool.getConnection !== "function") {
    return operation(pool);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function resetTeams(db) {
  await db.execute(
    `UPDATE teams
     SET status = 'open',
         project = '',
         meta_json = JSON_REMOVE(meta_json, '$.members', '$.advisor', '$.project', '$.expert', '$.votes')`,
  );
}

async function resetEventStages(db) {
  await db.execute("DELETE FROM event_stages");
  for (const [index, stage] of DEFAULT_ADMIN_STAGES.entries()) {
    await db.execute(
      `INSERT INTO event_stages (id, name, subtitle, display_time, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        stage.id,
        stage.name,
        stage.subtitle || "",
        stage.time || "",
        index === 0 ? "active" : "pending",
        index,
      ],
    );
  }
}

async function resetVoteWindow(db) {
  await db.execute("DELETE FROM vote_windows WHERE id <> ?", ["main"]);
  await db.execute(
    `INSERT INTO vote_windows (id, status, window_label, point_scale_json)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       window_label = VALUES(window_label),
       point_scale_json = VALUES(point_scale_json),
       updated_at = CURRENT_TIMESTAMP`,
    ["main", "closed", "投票已关闭", JSON.stringify(DEFAULT_POINT_SCALE)],
  );
}

async function resetMissionCountdown(db) {
  await db.execute(
    `INSERT INTO mission_countdowns (id, started_at, duration_ms)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       started_at = VALUES(started_at),
       duration_ms = VALUES(duration_ms),
       updated_at = CURRENT_TIMESTAMP`,
    ["main", null, MISSION_DURATION_MS],
  );
}

async function resetRoadshow(db) {
  await db.execute(
    `INSERT INTO roadshow_sessions (id, current_team_id, next_team_id, phase, started_at, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       current_team_id = VALUES(current_team_id),
       next_team_id = VALUES(next_team_id),
       phase = VALUES(phase),
       started_at = VALUES(started_at),
       duration_ms = VALUES(duration_ms),
       updated_at = CURRENT_TIMESTAMP`,
    ["main", "marketing", "functions", "DEMO", null, ROADSHOW_DURATION_MS],
  );
}

async function executeDatabaseReset(pool) {
  return withTransaction(pool, async (db) => {
    for (const table of CLEARED_TABLES) {
      await db.execute(`DELETE FROM ${table}`);
    }
    await resetTeams(db);
    await resetEventStages(db);
    await resetVoteWindow(db);
    await resetMissionCountdown(db);
    await resetRoadshow(db);
  });
}

async function removeWorkUploads(publicRoot) {
  const workUploadsPath = path.join(publicRoot, "assets", "uploads", "works");
  await fs.rm(workUploadsPath, { recursive: true, force: true });
}

async function resetHackathonState({
  pool,
  dryRun = true,
  backup = !dryRun,
  publicRoot = path.join(__dirname, ".."),
  backupRoot = path.join(__dirname, "..", "backups", "prelaunch-reset"),
  now = new Date(),
} = {}) {
  ensureMysqlPool(pool);

  const resolvedPublicRoot = path.resolve(publicRoot);
  const countsBefore = await collectTableCounts(pool);
  const workUploadCount = await countFiles(path.join(resolvedPublicRoot, "assets", "uploads", "works"));

  if (dryRun) {
    return {
      dryRun: true,
      countsBefore,
      workUploadCount,
      preservedTables: PRESERVED_TABLES,
      clearedTables: CLEARED_TABLES,
      stateTables: STATE_TABLES,
    };
  }

  const backupDir = path.join(path.resolve(backupRoot), safeTimestamp(now));
  if (backup) {
    await backupMysqlTables(pool, backupDir);
    await backupWorkUploads({
      publicRoot: resolvedPublicRoot,
      backupDir,
    });
  }

  await executeDatabaseReset(pool);
  await removeWorkUploads(resolvedPublicRoot);

  return {
    dryRun: false,
    backupDir: backup ? backupDir : "",
    countsBefore,
    countsAfter: await collectTableCounts(pool),
    workUploadCount,
    preservedTables: PRESERVED_TABLES,
    clearedTables: CLEARED_TABLES,
    stateTables: STATE_TABLES,
  };
}

module.exports = {
  BACKUP_TABLES,
  CLEARED_TABLES,
  MISSION_DURATION_MS,
  PRESERVED_TABLES,
  ROADSHOW_DURATION_MS,
  STATE_TABLES,
  resetHackathonState,
};
