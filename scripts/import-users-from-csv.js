#!/usr/bin/env node

const path = require("node:path");
const { loadEnv } = require("../server/loadEnv");
const { importUsersFromCsv } = require("../server/userCsvImporter");

function readOption(argv, index) {
  const arg = argv[index];
  if (arg.includes("=")) {
    return [arg.split("=").slice(1).join("="), index];
  }
  return [argv[index + 1], index + 1];
}

function parseArgs(argv) {
  const options = {
    execute: false,
    json: false,
    backupDir: path.join(__dirname, "..", "docs", "user-import-backups"),
    defaultRole: "public",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.execute = false;
    } else if (arg === "--execute") {
      options.execute = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--no-backup") {
      options.backupDir = false;
    } else if (arg === "--source" || arg.startsWith("--source=")) {
      const [value, nextIndex] = readOption(argv, index);
      options.source = value;
      index = nextIndex;
    } else if (arg === "--default-role" || arg.startsWith("--default-role=")) {
      const [value, nextIndex] = readOption(argv, index);
      options.defaultRole = value;
      index = nextIndex;
    } else if (arg === "--backup-dir" || arg.startsWith("--backup-dir=")) {
      const [value, nextIndex] = readOption(argv, index);
      options.backupDir = value;
      index = nextIndex;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (!arg.startsWith("-") && !options.csvPath) {
      options.csvPath = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/import-users-from-csv.js <users.csv> --dry-run
  node scripts/import-users-from-csv.js <users.csv> --execute

Options:
  --dry-run                 Preview insert/update/error counts without writing data. Default mode.
  --execute                 Backup users and role_assignments, then write CSV users to MySQL.
  --source <name>           Source label saved on role_assignments and audit_logs.
  --default-role <role>     Role used when a row has no role cell. Default: public.
  --backup-dir <path>       Backup root for execute mode.
  --no-backup               Skip table backup. Use only for tests or disposable databases.
  --json                    Print raw JSON result.
`);
}

function printHumanResult(result) {
  console.log(result.mode === "execute" ? "CSV user import executed" : "CSV user import dry-run");
  console.log(`Source: ${result.source}`);
  if (result.backupDir) {
    console.log(`Backup: ${result.backupDir}`);
  }
  console.log("");
  console.log(`Rows: ${result.totalRows}`);
  console.log(`Valid users: ${result.validUsers}`);
  console.log(`Existing users: ${result.existingUsers}`);
  console.log(`Users to insert: ${result.insertUsers}`);
  console.log(`Users to update: ${result.updateUsers}`);
  console.log(`Explicit-role users: ${result.explicitRoleUsers}`);
  console.log(`Default-role users: ${result.defaultRoleUsers}`);
  console.log(`Role assignments planned: ${result.roleAssignments}`);
  console.log("");
  console.log(`Role policy: ${result.rolePolicy}`);

  if (result.errors.length || result.duplicates.length) {
    console.log("");
    console.log("Problems:");
    result.errors.slice(0, 20).forEach((error) => {
      console.log(`  row ${error.rowNumber}: ${error.code} ${error.id ? `(${error.id}) ` : ""}${error.message}`);
    });
    result.duplicates.slice(0, 20).forEach((duplicate) => {
      console.log(`  row ${duplicate.rowNumber}: duplicate (${duplicate.id}) ${duplicate.message}`);
    });
    if (result.errors.length + result.duplicates.length > 20) {
      console.log(`  ... ${result.errors.length + result.duplicates.length - 20} more`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (!options.csvPath) {
    printHelp();
    throw new Error("CSV path is required.");
  }

  loadEnv();
  const result = await importUsersFromCsv({
    csvPath: options.csvPath,
    execute: options.execute,
    source: options.source,
    defaultRole: options.defaultRole,
    backupDir: options.backupDir,
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHumanResult(result);
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
