const fs = require("node:fs/promises");
const path = require("node:path");
const { createMysqlPool } = require("./mysqlClient");

const DEFAULT_SCHEMA_PATH = path.join(__dirname, "../db/schema.mysql.sql");

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

  try {
    for (const statement of statements) {
      await activePool.execute(statement);
    }
  } finally {
    if (ownsPool && activePool && typeof activePool.end === "function") {
      await activePool.end();
    }
  }

  return { applied: statements.length };
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
