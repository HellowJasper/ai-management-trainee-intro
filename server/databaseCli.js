const fs = require("node:fs/promises");
const path = require("node:path");
const { createMysqlPool } = require("./mysqlClient");

const DEFAULT_SCHEMA_PATH = path.join(__dirname, "../db/schema.mysql.sql");
const POST_SCHEMA_MIGRATIONS = [
  {
    tableName: "result_snapshots",
    columnName: "source_json",
    statement: "ALTER TABLE result_snapshots ADD COLUMN source_json JSON NULL AFTER result_json",
  },
];

function splitSqlStatements(sql) {
  return String(sql || "")
    .split(/;\s*(?:\r?\n|$)/g)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function applySchema({ schemaPath = DEFAULT_SCHEMA_PATH, pool, createPool = createMysqlPool } = {}) {
  const sql = await fs.readFile(schemaPath, "utf8");
  const statements = splitSqlStatements(sql);
  const activePool = pool || createPool();
  const ownsPool = !pool;
  let migrations = 0;

  try {
    for (const statement of statements) {
      await activePool.execute(statement);
    }
    migrations = await applyPostSchemaMigrations(activePool);
  } finally {
    if (ownsPool && activePool && typeof activePool.end === "function") {
      await activePool.end();
    }
  }

  return { applied: statements.length, migrations };
}

async function columnExists(pool, tableName, columnName) {
  const [rows] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName],
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function tableExists(pool, tableName) {
  const [rows] = await pool.execute(
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     LIMIT 1`,
    [tableName],
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function applyPostSchemaMigrations(pool) {
  let applied = 0;
  for (const migration of POST_SCHEMA_MIGRATIONS) {
    if (!(await tableExists(pool, migration.tableName))) {
      continue;
    }
    if (await columnExists(pool, migration.tableName, migration.columnName)) {
      continue;
    }
    await pool.execute(migration.statement);
    applied += 1;
  }
  return applied;
}

if (require.main === module) {
  require("./loadEnv").loadEnv();
  applySchema()
    .then((result) => {
      console.log(`Applied ${result.applied} schema statements.`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = {
  applySchema,
  splitSqlStatements,
};
