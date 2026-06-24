const test = require("node:test");
const assert = require("node:assert/strict");

const { createMysqlResultSnapshotsRepository } = require("../server/mysqlResultSnapshotsRepository");
const { createRepositoryBundle } = require("../server/repositoryFactory");

class MemoryMysqlResultSnapshotsPool {
  constructor(rows = []) {
    this.calls = [];
    this.rows = rows.map((row, index) => ({
      id: row.id || index + 1,
      status: row.status || "published",
      point_scale_json: JSON.stringify(row.pointScale || [100, 85, 70, 55, 40]),
      result_json: JSON.stringify(row.results || []),
      published_by: row.publishedBy || "admin",
      published_at: row.publishedAt || `2026-01-01T00:00:0${index}.000Z`,
    }));
  }

  async execute(sql, params = []) {
    this.calls.push({ sql, params });
    const compactSql = sql.replace(/\s+/g, " ").trim().toLowerCase();

    if (compactSql.startsWith("select id, status, point_scale_json, result_json")) {
      const [status] = params;
      return [this.rows
        .filter((row) => row.status === status)
        .slice()
        .sort((a, b) => Number(b.id) - Number(a.id))
        .slice(0, 1)
        .map((row) => ({ ...row }))];
    }

    if (compactSql.startsWith("insert into result_snapshots")) {
      const [status, pointScaleJson, resultJson, publishedBy] = params;
      const row = {
        id: this.rows.length + 1,
        status,
        point_scale_json: pointScaleJson,
        result_json: resultJson,
        published_by: publishedBy,
        published_at: "2026-01-01T00:00:10.000Z",
      };
      this.rows.push(row);
      return [{ insertId: row.id, affectedRows: 1 }];
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  }
}

test("MySQL result snapshots repository publishes immutable final results", async () => {
  const pool = new MemoryMysqlResultSnapshotsPool();
  const repository = createMysqlResultSnapshotsRepository(pool);

  const snapshot = await repository.publishSnapshot({
    pointScale: [100, 85, 70, 55, 40],
    results: [
      { id: "marketing", name: "营销", totalScore: 95.24, isChampion: true },
      { id: "pharma", name: "药学", totalScore: 91.1 },
    ],
    publishedBy: "admin-001",
  });

  assert.equal(snapshot.id, "1");
  assert.equal(snapshot.status, "published");
  assert.equal(snapshot.publishedBy, "admin-001");
  assert.equal(snapshot.results[0].id, "marketing");
  assert.equal(snapshot.results[0].isChampion, true);

  const latest = await repository.getLatestSnapshot();
  assert.equal(latest.id, "1");
  assert.deepEqual(latest.pointScale, [100, 85, 70, 55, 40]);
  assert.equal(latest.results.length, 2);
});

test("repository factory wires the MySQL result snapshots repository", async () => {
  const pool = new MemoryMysqlResultSnapshotsPool();
  const bundle = createRepositoryBundle({
    dataBackend: "mysql",
    mysqlPool: pool,
  });

  assert.equal(bundle.dataBackend, "mysql");
  assert.equal(typeof bundle.resultSnapshotRepository.publishSnapshot, "function");
  assert.equal(typeof bundle.resultSnapshotRepository.getLatestSnapshot, "function");
});
