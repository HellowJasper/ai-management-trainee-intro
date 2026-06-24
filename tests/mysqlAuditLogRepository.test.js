const test = require("node:test");
const assert = require("node:assert/strict");

const { createMysqlAuditLogRepository } = require("../server/mysqlAuditLogRepository");
const { createRepositoryBundle } = require("../server/repositoryFactory");

class MemoryMysqlAuditLogPool {
  constructor(rows = []) {
    this.calls = [];
    this.rows = rows.map((row, index) => ({
      id: row.id || index + 1,
      actor: row.actor || "system",
      action: row.action || "event.recorded",
      target_type: row.targetType || "",
      target_id: row.targetId || "",
      message: row.message || "",
      before_json: row.before ? JSON.stringify(row.before) : null,
      after_json: row.after ? JSON.stringify(row.after) : null,
      ip: row.ip || "",
      created_at: row.createdAt || `2026-01-01T00:00:0${index}.000Z`,
    }));
  }

  async execute(sql, params = []) {
    this.calls.push({ sql, params });
    const compactSql = sql.replace(/\s+/g, " ").trim().toLowerCase();

    if (compactSql.startsWith("select id, actor, action, target_type, target_id, message")) {
      const limit = Number(params[0]) || 80;
      return [this.rows
        .slice()
        .sort((a, b) => Number(b.id) - Number(a.id))
        .slice(0, limit)
        .map((row) => ({ ...row }))];
    }

    if (compactSql.startsWith("insert into audit_logs")) {
      const [actor, action, targetType, targetId, message, beforeJson, afterJson, ip] = params;
      const row = {
        id: this.rows.length + 1,
        actor,
        action,
        target_type: targetType,
        target_id: targetId,
        message,
        before_json: beforeJson,
        after_json: afterJson,
        ip,
        created_at: "2026-01-01T00:00:10.000Z",
      };
      this.rows.push(row);
      return [{ insertId: row.id, affectedRows: 1 }];
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  }
}

test("MySQL audit log repository records and lists newest logs first", async () => {
  const pool = new MemoryMysqlAuditLogPool([
    {
      id: 1,
      actor: "admin-a",
      action: "stage.changed",
      targetType: "stage",
      targetId: "team",
      message: "开启组队",
    },
  ]);
  const repository = createMysqlAuditLogRepository(pool);

  const log = await repository.record({
    actor: "admin-b",
    action: "work.statusChanged",
    targetType: "work",
    targetId: "marketing",
    message: "发布作品",
    before: { status: "submitted" },
    after: { status: "published" },
  });

  assert.equal(log.actor, "admin-b");
  assert.equal(log.action, "work.statusChanged");
  assert.equal(log.targetId, "marketing");

  const state = await repository.listLogs({ limit: 1 });
  assert.equal(state.logs.length, 1);
  assert.equal(state.logs[0].action, "work.statusChanged");
  assert.equal(state.logs[0].message, "发布作品");
});

test("repository factory wires the MySQL audit log repository", async () => {
  const pool = new MemoryMysqlAuditLogPool();
  const bundle = createRepositoryBundle({
    dataBackend: "mysql",
    mysqlPool: pool,
  });

  assert.equal(bundle.dataBackend, "mysql");
  assert.equal(typeof bundle.auditLogRepository.record, "function");
});
