const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createMysqlTraineeRepository } = require("../server/mysqlTraineeRepository");
const { createRepositoryBundle } = require("../server/repositoryFactory");

class MemoryMysqlPool {
  constructor(initialRows = []) {
    this.rows = new Map();
    this.calls = [];
    initialRows.forEach((row) => {
      this.rows.set(row.id, {
        id: row.id,
        name: row.name || "",
        roman_name: row.romanName || "",
        department: row.department || "",
        department_en: row.departmentEn || "",
        sentence: row.sentence || "",
        profile_json: JSON.stringify(row),
      });
    });
  }

  async execute(sql, params = []) {
    this.calls.push({ sql, params });
    const compactSql = sql.replace(/\s+/g, " ").trim().toLowerCase();

    if (compactSql.startsWith("select profile_json from trainees where id")) {
      const row = this.rows.get(params[0]);
      return [row ? [{ profile_json: row.profile_json }] : []];
    }

    if (compactSql.startsWith("select profile_json from trainees order by")) {
      return [[...this.rows.values()]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((row) => ({ profile_json: row.profile_json }))];
    }

    if (compactSql.startsWith("select id from trainees where id")) {
      const row = this.rows.get(params[0]);
      return [row ? [{ id: row.id }] : []];
    }

    if (compactSql.startsWith("insert into trainees")) {
      const [id, name, romanName, department, departmentEn, sentence, profileJson] = params;
      this.rows.set(id, {
        id,
        name,
        roman_name: romanName,
        department,
        department_en: departmentEn,
        sentence,
        profile_json: profileJson,
      });
      return [{ affectedRows: 1 }];
    }

    if (compactSql.startsWith("update trainees set")) {
      const [name, romanName, department, departmentEn, sentence, profileJson, id] = params;
      if (!this.rows.has(id)) return [{ affectedRows: 0 }];
      this.rows.set(id, {
        id,
        name,
        roman_name: romanName,
        department,
        department_en: departmentEn,
        sentence,
        profile_json: profileJson,
      });
      return [{ affectedRows: 1 }];
    }

    if (compactSql.startsWith("delete from trainees where id")) {
      const existed = this.rows.delete(params[0]);
      return [{ affectedRows: existed ? 1 : 0 }];
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  }
}

test("MySQL schema defines the core backend tables from the architecture plan", () => {
  const schema = fs.readFileSync(path.join(__dirname, "../db/schema.mysql.sql"), "utf8");

  [
    "users",
    "role_assignments",
    "trainees",
    "teams",
    "team_members",
    "works",
    "votes",
    "judge_scores",
    "event_stages",
    "bigscreen_state",
    "roadshow_sessions",
    "mission_countdowns",
    "result_snapshots",
    "audit_logs",
  ].forEach((tableName) => {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}\\b`, "i"));
  });
});

test("MySQL trainee repository keeps the existing CRUD contract", async () => {
  const pool = new MemoryMysqlPool([
    {
      id: "jasper",
      name: "Jasper",
      department: "AI创新部",
      sentence: "",
      previousPairs: ["AI", "Ops"],
    },
  ]);
  const repository = createMysqlTraineeRepository(pool);

  const trainees = await repository.listTrainees();
  assert.equal(trainees.length, 1);
  assert.equal(trainees[0].id, "jasper");
  assert.deepEqual(trainees[0].previousPairs, ["AI", "Ops"]);

  const created = await repository.createTrainee({
    id: "lin-yixin",
    name: "林艺新",
    romanName: "Lin Yixin",
    department: "AI创新部",
    departmentEn: "AI INNOVATION",
  });
  assert.equal(created.id, "lin-yixin");

  const updated = await repository.updateTrainee("lin-yixin", {
    name: "林艺新-更新",
    previousPairs: ["Code", "Agent"],
    ignoredField: "must not persist",
  });
  assert.equal(updated.name, "林艺新-更新");
  assert.deepEqual(updated.previousPairs, ["Code", "Agent"]);
  assert.equal(updated.ignoredField, undefined);

  const sentence = await repository.saveSentence("lin-yixin", "用 Agent 把重复工作自动化。");
  assert.equal(sentence.sentence, "用 Agent 把重复工作自动化。");

  const removed = await repository.deleteTrainee("lin-yixin");
  assert.deepEqual(removed, { id: "lin-yixin" });

  const stored = JSON.parse(pool.rows.get("jasper").profile_json);
  assert.equal(stored.id, "jasper");
});

test("repository factory can switch the trainee repository to MySQL", async () => {
  const pool = new MemoryMysqlPool([{ id: "jasper", name: "Jasper" }]);
  const bundle = createRepositoryBundle({
    dataBackend: "mysql",
    mysqlPool: pool,
  });

  const trainees = await bundle.repository.listTrainees();

  assert.equal(bundle.dataBackend, "mysql");
  assert.equal(trainees[0].id, "jasper");
});
