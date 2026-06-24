const test = require("node:test");
const assert = require("node:assert/strict");

const { createMysqlWorksRepository } = require("../server/mysqlWorksRepository");
const { createRepositoryBundle } = require("../server/repositoryFactory");

class MemoryMysqlWorksPool {
  constructor(rows = []) {
    this.calls = [];
    this.rows = rows.map((row) => ({
      id: row.id || row.teamId,
      team_id: row.teamId,
      team_name: row.teamName || "",
      project: row.project || "",
      pitch: row.pitch || "",
      stack_json: JSON.stringify(row.stack || []),
      demo_url: row.demoUrl || "",
      code_url: row.codeUrl || "",
      doc_url: row.docUrl || "",
      screenshots_json: JSON.stringify(row.screenshots || []),
      status: row.status || "submitted",
      submitted_by: row.submittedBy || "",
      submitted_at: row.submittedAt || null,
      reviewed_by: row.reviewedBy || "",
      reviewed_at: row.reviewedAt || null,
      review_note: row.reviewNote || "",
      updated_at: row.updatedAt || "2026-01-01T00:00:00.000Z",
    }));
  }

  async execute(sql, params = []) {
    this.calls.push({ sql, params });
    const compactSql = sql.replace(/\s+/g, " ").trim().toLowerCase();

    if (compactSql.startsWith("select id, team_id, team_name, project, pitch, stack_json")) {
      let rows = this.rows.slice();
      if (compactSql.includes("where status = ?")) {
        rows = rows.filter((row) => row.status === params[0]);
      } else if (compactSql.includes("where id = ? or team_id = ?")) {
        rows = rows.filter((row) => row.id === params[0] || row.team_id === params[1]).slice(0, 1);
      }
      return [rows.map((row) => ({ ...row }))];
    }

    if (compactSql.startsWith("insert into works")) {
      const [
        id,
        teamId,
        teamName,
        project,
        pitch,
        stackJson,
        demoUrl,
        codeUrl,
        docUrl,
        screenshotsJson,
        status,
        submittedBy,
        submittedAt,
      ] = params;
      const next = {
        id,
        team_id: teamId,
        team_name: teamName,
        project,
        pitch,
        stack_json: stackJson,
        demo_url: demoUrl,
        code_url: codeUrl,
        doc_url: docUrl,
        screenshots_json: screenshotsJson,
        status,
        submitted_by: submittedBy,
        submitted_at: submittedAt,
        reviewed_by: "",
        reviewed_at: null,
        review_note: "",
        updated_at: "2026-01-01T00:00:10.000Z",
      };
      const index = this.rows.findIndex((row) => row.id === id);
      if (index === -1) this.rows.push(next);
      else this.rows[index] = { ...this.rows[index], ...next };
      return [{ affectedRows: 1 }];
    }

    if (compactSql.startsWith("update works set status")) {
      const [status, reviewedBy, reviewedAt, reviewNote, teamId, sameTeamId] = params;
      const row = this.rows.find((item) => item.id === teamId || item.team_id === sameTeamId);
      if (!row) return [{ affectedRows: 0 }];
      row.status = status;
      row.reviewed_by = reviewedBy;
      row.reviewed_at = reviewedAt;
      row.review_note = reviewNote;
      row.updated_at = reviewedAt;
      return [{ affectedRows: 1 }];
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  }
}

test("MySQL works repository preserves submit, list, detail, and review status contracts", async () => {
  const pool = new MemoryMysqlWorksPool([
    {
      teamId: "pharma",
      teamName: "药学",
      project: "药物信息检索助手",
      stack: ["RAG"],
      status: "published",
      submittedBy: "u1",
    },
  ]);
  const repository = createMysqlWorksRepository(pool);

  const published = await repository.listWorks({ status: "published" });
  assert.equal(published.length, 1);
  assert.deepEqual(published[0].stack, ["RAG"]);

  const submitted = await repository.submitWork({
    teamId: "marketing",
    teamName: "营销",
    project: "全域内容生成引擎",
    pitch: "提升内容生产效率",
    stack: "LLM / Workflow",
    screenshots: ["screen-a.png"],
    submittedBy: "u2",
  });
  assert.equal(submitted.accepted, true);
  assert.equal(submitted.work.status, "submitted");
  assert.deepEqual(submitted.work.stack, ["LLM", "Workflow"]);

  const detail = await repository.getWork("marketing");
  assert.equal(detail.project, "全域内容生成引擎");
  assert.deepEqual(detail.screenshots, ["screen-a.png"]);

  const reviewed = await repository.updateStatus("marketing", {
    status: "published",
    reviewerId: "admin-a",
    reviewNote: "可以展示",
  });
  assert.equal(reviewed.accepted, true);
  assert.equal(reviewed.work.status, "published");
  assert.equal(reviewed.work.reviewedBy, "admin-a");
  assert.equal(reviewed.work.reviewNote, "可以展示");
});

test("repository factory wires the MySQL works repository", async () => {
  const pool = new MemoryMysqlWorksPool();
  const bundle = createRepositoryBundle({
    dataBackend: "mysql",
    mysqlPool: pool,
  });

  assert.equal(bundle.dataBackend, "mysql");
  assert.equal(typeof bundle.worksRepository.submitWork, "function");
});
