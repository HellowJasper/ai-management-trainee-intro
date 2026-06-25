const test = require("node:test");
const assert = require("node:assert/strict");

const { createMysqlAdminStateRepository } = require("../server/mysqlAdminStateRepository");
const { createRepositoryBundle } = require("../server/repositoryFactory");

class MemoryMysqlAdminStatePool {
  constructor(stages = []) {
    this.calls = [];
    this.stages = stages.map((stage, index) => ({
      id: stage.id,
      name: stage.name || "",
      subtitle: stage.subtitle || "",
      display_time: stage.time || stage.displayTime || "",
      status: stage.status || "pending",
      sort_order: stage.sortOrder ?? index,
    }));
    this.bigscreenState = null;
  }

  async execute(sql, params = []) {
    this.calls.push({ sql, params });
    const compactSql = sql.replace(/\s+/g, " ").trim().toLowerCase();

    if (compactSql.startsWith("select id, name, subtitle, display_time, status, sort_order from event_stages order by")) {
      return [this.stages
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
        .map((row) => ({ ...row }))];
    }

    if (compactSql.startsWith("insert into event_stages")) {
      const [id, name, subtitle, displayTime, status, sortOrder] = params;
      const next = {
        id,
        name,
        subtitle,
        display_time: displayTime,
        status,
        sort_order: sortOrder,
      };
      const index = this.stages.findIndex((stage) => stage.id === id);
      if (index === -1) this.stages.push(next);
      else this.stages[index] = { ...this.stages[index], ...next };
      return [{ affectedRows: 1 }];
    }

    if (compactSql.startsWith("select view_name, params_json from bigscreen_state where id = ?")) {
      return [this.bigscreenState ? [{ ...this.bigscreenState }] : []];
    }

    if (compactSql.startsWith("insert into bigscreen_state")) {
      const [id, screenKey, viewName, paramsJson, pushedBy] = params;
      this.bigscreenState = {
        id,
        screen_key: screenKey,
        view_name: viewName,
        params_json: paramsJson,
        pushed_by: pushedBy,
      };
      return [{ affectedRows: 1 }];
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  }
}

test("MySQL admin state repository preserves stage switching and display time contracts", async () => {
  const pool = new MemoryMysqlAdminStatePool([
    { id: "team", name: "组队开启", subtitle: "实时组队", time: "05-22 14:00\n进行中", status: "active" },
    { id: "vote", name: "投票开启", subtitle: "路演投票开启", time: "预计 05-24 10:00\n-", status: "pending" },
    { id: "result", name: "结果发布", subtitle: "结果揭晓与颁奖", time: "预计 05-24 17:30\n-", status: "pending" },
  ]);
  const repository = createMysqlAdminStateRepository(pool);

  const state = await repository.getState();
  assert.equal(state.currentStageId, "team");
  assert.deepEqual(state.stages.map((stage) => stage.status), ["active", "pending", "pending"]);

  const voteState = await repository.setCurrentStage("vote");
  assert.equal(voteState.currentStageId, "vote");
  assert.equal(voteState.screenOverrideStageId, "");
  assert.deepEqual(voteState.stages.map((stage) => stage.status), ["done", "active", "pending"]);
  assert.equal(voteState.logs[0].message, "开启阶段【投票开启】");

  const lockedState = await repository.setScreenOverride("result", "admin-user");
  assert.equal(lockedState.currentStageId, "vote");
  assert.equal(lockedState.screenOverrideStageId, "result");
  assert.equal(lockedState.logs[0].message, "锁定大屏【结果发布】");
  assert.deepEqual(JSON.parse(pool.bigscreenState.params_json), { stageId: "result" });

  const clearedState = await repository.setScreenOverride("");
  assert.equal(clearedState.currentStageId, "vote");
  assert.equal(clearedState.screenOverrideStageId, "");
  assert.deepEqual(JSON.parse(pool.bigscreenState.params_json), { stageId: "" });

  const timeState = await repository.updateDisplayTimes({
    stages: [
      { id: "vote", time: "05-24 10:00\n05-24 10:20" },
      { id: "unknown", time: "ignored" },
    ],
  });
  assert.equal(timeState.stages.find((stage) => stage.id === "vote").time, "05-24 10:00\n05-24 10:20");
  assert.equal(timeState.logs[0].message, "更新时间显示配置");

  await assert.rejects(
    () => repository.setCurrentStage("missing"),
    /Unknown admin stage id/,
  );
});

test("repository factory wires the MySQL admin state repository", async () => {
  const pool = new MemoryMysqlAdminStatePool([
    { id: "team", name: "组队开启", status: "active" },
  ]);
  const bundle = createRepositoryBundle({
    dataBackend: "mysql",
    mysqlPool: pool,
  });

  assert.equal(bundle.dataBackend, "mysql");
  assert.equal(typeof bundle.adminStateRepository.getState, "function");
});
