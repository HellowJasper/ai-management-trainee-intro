const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { applySchema } = require("../server/databaseCli");

test("applySchema closes a pool it creates internally", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-schema-"));
  const schemaPath = path.join(tempDir, "schema.sql");
  await fs.writeFile(schemaPath, "CREATE TABLE one (id INT);\nCREATE TABLE two (id INT);\n");

  const executed = [];
  let closed = false;
  const pool = {
    async execute(sql) {
      executed.push(sql);
      if (/information_schema\.tables/i.test(sql)) {
        return [[]];
      }
      if (/information_schema\.columns/i.test(sql)) {
        return [[{ COLUMN_NAME: "source_json" }]];
      }
      return [{ affectedRows: 1 }];
    },
    async end() {
      closed = true;
    },
  };

  const result = await applySchema({
    schemaPath,
    createPool: () => pool,
  });

  assert.equal(result.applied, 2);
  assert.equal(executed.filter((sql) => /^CREATE TABLE/i.test(sql)).length, 2);
  assert.equal(closed, true);
});

test("applySchema does not close a caller-owned pool", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-schema-"));
  const schemaPath = path.join(tempDir, "schema.sql");
  await fs.writeFile(schemaPath, "CREATE TABLE one (id INT);\n");

  let closed = false;
  const pool = {
    async execute(sql) {
      if (/information_schema\.tables/i.test(sql)) {
        return [[]];
      }
      if (/information_schema\.columns/i.test(sql)) {
        return [[{ COLUMN_NAME: "source_json" }]];
      }
      return [{ affectedRows: 1 }];
    },
    async end() {
      closed = true;
    },
  };

  await applySchema({ schemaPath, pool });

  assert.equal(closed, false);
});

test("applySchema adds result snapshot source_json to existing MySQL tables", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-schema-"));
  const schemaPath = path.join(tempDir, "schema.sql");
  await fs.writeFile(schemaPath, "CREATE TABLE IF NOT EXISTS result_snapshots (id BIGINT);\n");

  const executed = [];
  const pool = {
    async execute(sql, params = []) {
      executed.push({ sql, params });
      if (/information_schema\.tables/i.test(sql)) {
        return [[{ TABLE_NAME: "result_snapshots" }]];
      }
      if (/information_schema\.columns/i.test(sql)) {
        return [[]];
      }
      return [{ affectedRows: 1 }];
    },
  };

  const result = await applySchema({ schemaPath, pool });

  assert.equal(result.applied, 1);
  assert.equal(result.migrations, 1);
  assert.ok(executed.some((call) => /alter table result_snapshots add column source_json json null/i.test(call.sql)));
  assert.ok(executed.some((call) => /information_schema\.columns/i.test(call.sql)
    && call.params[0] === "result_snapshots"
    && call.params[1] === "source_json"));
});

test("applySchema skips result snapshot migrations when the table is absent", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-schema-"));
  const schemaPath = path.join(tempDir, "schema.sql");
  await fs.writeFile(schemaPath, "CREATE TABLE one (id INT);\n");

  const executed = [];
  const pool = {
    async execute(sql, params = []) {
      executed.push({ sql, params });
      if (/information_schema\.tables/i.test(sql)) {
        return [[]];
      }
      if (/information_schema\.columns/i.test(sql)) {
        throw new Error("column lookup should be skipped when table is absent");
      }
      return [{ affectedRows: 1 }];
    },
  };

  const result = await applySchema({ schemaPath, pool });

  assert.equal(result.applied, 1);
  assert.equal(result.migrations, 0);
  assert.equal(executed.some((call) => /alter table result_snapshots/i.test(call.sql)), false);
});
