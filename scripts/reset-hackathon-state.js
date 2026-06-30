#!/usr/bin/env node

const path = require("node:path");
const { loadEnv } = require("../server/loadEnv");
const { createMysqlPool } = require("../server/mysqlClient");
const { resetHackathonState } = require("../server/hackathonStateReset");

function parseArgs(argv) {
  const options = {
    dryRun: true,
    publicRoot: path.join(__dirname, ".."),
    backupRoot: path.join(__dirname, "..", "backups", "prelaunch-reset"),
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--execute") {
      options.dryRun = false;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--public-root") {
      options.publicRoot = argv[index + 1];
      index += 1;
    } else if (arg === "--backup-root") {
      options.backupRoot = argv[index + 1];
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/reset-hackathon-state.js --dry-run
  CONFIRM_PRELAUNCH_RESET=<database> node scripts/reset-hackathon-state.js --execute

Options:
  --dry-run             Show planned reset impact without changing data.
  --execute             Backup and reset MySQL runtime state. Requires CONFIRM_PRELAUNCH_RESET to equal the target database name.
  --public-root <path>  Static public root that contains assets/uploads.
  --backup-root <path>  Directory where reset backups are created.
  --json                Print raw JSON result.
`);
}

function resolveTargetDatabaseName() {
  if (process.env.MYSQL_DATABASE) {
    return String(process.env.MYSQL_DATABASE).trim();
  }
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (databaseUrl) {
    try {
      return decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, "")).trim();
    } catch {
      return "";
    }
  }
  return "joincare_hackathon";
}

function assertExecuteConfirmed(options = {}) {
  if (options.dryRun) {
    return;
  }
  const targetDatabase = resolveTargetDatabaseName();
  const confirmation = String(process.env.CONFIRM_PRELAUNCH_RESET || "").trim();
  if (!targetDatabase || confirmation !== targetDatabase) {
    throw new Error(`Refusing to execute prelaunch reset. Set CONFIRM_PRELAUNCH_RESET=${targetDatabase || "<target-database>"} to confirm the target database.`);
  }
}

function printHumanResult(result) {
  console.log(result.dryRun ? "Prelaunch reset dry-run" : "Prelaunch reset executed");
  if (result.backupDir) {
    console.log(`Backup: ${result.backupDir}`);
  }
  console.log("");
  console.log("Counts before:");
  Object.entries(result.countsBefore).forEach(([table, count]) => {
    console.log(`  ${table}: ${count}`);
  });
  if (result.countsAfter) {
    console.log("");
    console.log("Counts after:");
    Object.entries(result.countsAfter).forEach(([table, count]) => {
      console.log(`  ${table}: ${count}`);
    });
  }
  console.log("");
  console.log(`Work upload files: ${result.workUploadCount}`);
  console.log(`Preserved tables: ${result.preservedTables.join(", ")}`);
  console.log(`Cleared tables: ${result.clearedTables.join(", ")}`);
  console.log(`Reset state tables: ${result.stateTables.join(", ")}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  loadEnv();
  assertExecuteConfirmed(options);
  const pool = createMysqlPool();
  try {
    const result = await resetHackathonState({
      pool,
      dryRun: options.dryRun,
      publicRoot: options.publicRoot,
      backupRoot: options.backupRoot,
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printHumanResult(result);
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  parseArgs,
};
