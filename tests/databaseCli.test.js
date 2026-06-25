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
  assert.equal(executed.length, 2);
  assert.equal(closed, true);
});

test("applySchema does not close a caller-owned pool", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-schema-"));
  const schemaPath = path.join(tempDir, "schema.sql");
  await fs.writeFile(schemaPath, "CREATE TABLE one (id INT);\n");

  let closed = false;
  const pool = {
    async execute() {},
    async end() {
      closed = true;
    },
  };

  await applySchema({ schemaPath, pool });

  assert.equal(closed, false);
});
