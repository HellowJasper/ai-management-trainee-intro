const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { importUsersFromCsv, parseUserCsv } = require("../server/userCsvImporter");

function createPool({ existingUsers = [] } = {}) {
  const executed = [];
  return {
    executed,
    async execute(sql, params = []) {
      executed.push({ sql, params });
      const normalizedSql = sql.replace(/\s+/g, " ").trim().toLowerCase();
      if (normalizedSql.startsWith("select * from users")) {
        return [existingUsers];
      }
      if (normalizedSql.startsWith("select * from role_assignments")) {
        return [[]];
      }
      if (normalizedSql.startsWith("select id, feishu_open_id")) {
        const ids = new Set(params);
        return [existingUsers.filter((user) => ids.has(user.id))];
      }
      return [{ affectedRows: 1 }, []];
    },
  };
}

function mutationStatements(pool) {
  return pool.executed.filter((item) => /^(insert|update|delete)\b/i.test(item.sql.trim()));
}

test("user CSV parser accepts Chinese headers, role labels, duplicate ids, and missing ids", () => {
  const parsed = parseUserCsv(`\uFEFF用户ID,姓名,部门,角色,头像
jky001,张三,AIDD研究部,"评委；选手",https://example.com/a.png
jky002,李四,注册部,,
,缺少ID,药学研发中心,观众,
jky001,重复用户,重复部门,观众,
`);

  assert.equal(parsed.totalRows, 4);
  assert.equal(parsed.users.length, 2);
  assert.equal(parsed.users[0].id, "jky001");
  assert.deepEqual(parsed.users[0].roles, ["judge", "player"]);
  assert.equal(parsed.users[0].hasExplicitRoles, true);
  assert.deepEqual(parsed.users[1].roles, ["public"]);
  assert.equal(parsed.users[1].hasExplicitRoles, false);
  assert.deepEqual(parsed.duplicates.map((item) => item.id), ["jky001"]);
  assert.deepEqual(parsed.errors.map((item) => item.code), ["missing_user_id"]);

  const chineseDefault = parseUserCsv(`用户ID,姓名
jky003,王五
`, { defaultRole: "观众" });
  assert.deepEqual(chineseDefault.users[0].roles, ["public"]);

  const exportedCsv = parseUserCsv(`用户ID,姓名,系统角色
jky004,赵六,评委/选手
`);
  assert.deepEqual(exportedCsv.users[0].roles, ["judge", "player"]);
  assert.equal(exportedCsv.users[0].hasExplicitRoles, true);
});

test("user CSV dry-run reports insert and update counts without writing database rows", async () => {
  const pool = createPool({
    existingUsers: [
      { id: "jky001", name: "旧名字", department: "旧部门", avatar_url: "", status: "active" },
    ],
  });

  const result = await importUsersFromCsv({
    csvText: `user_id,name,department,roles
jky001,张三,AIDD研究部,judge
jky002,李四,注册部,
`,
    pool,
  });

  assert.equal(result.mode, "dry-run");
  assert.equal(result.totalRows, 2);
  assert.equal(result.validUsers, 2);
  assert.equal(result.existingUsers, 1);
  assert.equal(result.insertUsers, 1);
  assert.equal(result.updateUsers, 1);
  assert.equal(result.explicitRoleUsers, 1);
  assert.equal(result.defaultRoleUsers, 1);
  assert.equal(mutationStatements(pool).length, 0);
});

test("user CSV execute bulk upserts users, backs up tables, and only replaces explicit roles", async () => {
  const backupDir = await fs.mkdtemp(path.join(os.tmpdir(), "user-csv-backup-"));
  const pool = createPool({
    existingUsers: [
      { id: "jky001", name: "旧名字", department: "旧部门", avatar_url: "", status: "active" },
    ],
  });

  const result = await importUsersFromCsv({
    csvText: `用户ID,姓名,部门,角色
jky001,张三,AIDD研究部,评委/选手
jky002,李四,注册部,
`,
    pool,
    execute: true,
    backupDir,
    source: "csv-test",
  });

  assert.equal(result.mode, "execute");
  assert.equal(result.insertUsers, 1);
  assert.equal(result.updateUsers, 1);
  assert.equal(result.roleAssignments, 3);
  assert.ok(result.backupDir.startsWith(backupDir));

  const backupFiles = await fs.readdir(result.backupDir);
  assert.ok(backupFiles.includes("users.json"));
  assert.ok(backupFiles.includes("role_assignments.json"));

  const userUpsert = pool.executed.find((item) => /insert into users/i.test(item.sql));
  assert.ok(userUpsert);
  assert.ok(userUpsert.params.includes("jky001"));
  assert.ok(userUpsert.params.includes("jky002"));

  const disableRoles = pool.executed.find((item) => /update role_assignments set status = 'disabled'/i.test(item.sql));
  assert.ok(disableRoles);
  assert.deepEqual(disableRoles.params, ["jky001"]);

  const roleUpsert = pool.executed.find((item) => /insert into role_assignments/i.test(item.sql));
  assert.ok(roleUpsert);
  assert.ok(roleUpsert.params.includes("jky001"));
  assert.ok(roleUpsert.params.includes("judge"));
  assert.ok(roleUpsert.params.includes("player"));
  assert.ok(roleUpsert.params.includes("jky002"));
  assert.ok(roleUpsert.params.includes("public"));

  assert.ok(pool.executed.some((item) => /insert into audit_logs/i.test(item.sql)));
});

test("user CSV execute refuses invalid roles before any mutation", async () => {
  const pool = createPool();

  await assert.rejects(
    () => importUsersFromCsv({
      csvText: `user_id,name,role
jky001,张三,超级管理员
`,
      pool,
      execute: true,
      backupDir: false,
    }),
    /CSV has 1 error/,
  );

  assert.equal(mutationStatements(pool).length, 0);
});
