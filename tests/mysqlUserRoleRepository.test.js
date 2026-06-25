const test = require("node:test");
const assert = require("node:assert/strict");

const { createMysqlUserRoleRepository } = require("../server/mysqlUserRoleRepository");
const { createRepositoryBundle } = require("../server/repositoryFactory");

class MemoryMysqlUserRolePool {
  constructor() {
    this.calls = [];
    this.users = [];
    this.roleAssignments = [];
  }

  async execute(sql, params = []) {
    this.calls.push({ sql, params });
    const compactSql = sql.replace(/\s+/g, " ").trim().toLowerCase();

    if (compactSql.startsWith("select u.id, u.feishu_open_id")) {
      const rows = this.users
        .filter((user) => user.status === "active")
        .map((user) => ({
          ...user,
          roles: this.roleAssignments
            .filter((assignment) => assignment.user_id === user.id && assignment.status === "active")
            .map((assignment) => assignment.role)
            .sort()
            .join(","),
        }));
      return [rows];
    }

    if (compactSql.startsWith("insert into users")) {
      const [id, openId, unionId, name, department, avatarUrl, status] = params;
      const existing = this.users.find((user) => user.id === id);
      if (existing) {
        existing.feishu_open_id = openId;
        existing.feishu_union_id = unionId;
        existing.name = name;
        existing.department = department;
        existing.avatar_url = avatarUrl;
        existing.status = status;
      } else {
        this.users.push({
          id,
          feishu_open_id: openId,
          feishu_union_id: unionId,
          name,
          department,
          avatar_url: avatarUrl,
          status,
        });
      }
      return [{ affectedRows: 1 }];
    }

    if (compactSql.startsWith("update role_assignments set status")) {
      const [userId] = params;
      this.roleAssignments.forEach((assignment) => {
        if (assignment.user_id === userId) {
          assignment.status = "disabled";
        }
      });
      return [{ affectedRows: 1 }];
    }

    if (compactSql.startsWith("insert into role_assignments")) {
      const [userId, role, source, status] = params;
      const existing = this.roleAssignments.find((assignment) => assignment.user_id === userId && assignment.role === role);
      if (existing) {
        existing.source = source;
        existing.status = status;
      } else {
        this.roleAssignments.push({
          id: this.roleAssignments.length + 1,
          user_id: userId,
          role,
          source,
          status,
        });
      }
      return [{ affectedRows: 1 }];
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  }
}

test("MySQL user role repository stores users and resolves active login roles", async () => {
  const pool = new MemoryMysqlUserRolePool();
  const repository = createMysqlUserRoleRepository(pool);

  const saved = await repository.upsertUser({
    id: "user-001",
    openId: "ou-001",
    unionId: "un-001",
    name: "测试选手",
    department: "AI创新部",
    avatar: "https://example.com/avatar.png",
    roles: ["player", "judge"],
    source: "admin",
  });

  assert.equal(saved.id, "user-001");
  assert.deepEqual(saved.roles, ["judge", "player"]);

  const resolved = await repository.resolveLoginUser({ userId: "user-001" });
  assert.equal(resolved.user.id, "user-001");
  assert.equal(resolved.user.name, "测试选手");
  assert.deepEqual(resolved.roles, ["judge", "player"]);
  assert.equal(resolved.role, "judge");
});

test("repository factory wires the MySQL user role repository", async () => {
  const pool = new MemoryMysqlUserRolePool();
  const bundle = createRepositoryBundle({
    dataBackend: "mysql",
    mysqlPool: pool,
  });

  assert.equal(bundle.dataBackend, "mysql");
  assert.equal(typeof bundle.userRoleRepository.upsertUser, "function");
  assert.equal(typeof bundle.userRoleRepository.resolveLoginUser, "function");
});
