const { createHttpError } = require("./traineeRepository");
const { normalizeRoles } = require("./userRoleRepository");

function normalizeRowUser(row = {}) {
  const roles = normalizeRoles(String(row.roles || "")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean));
  return {
    id: String(row.id || "").trim(),
    openId: String(row.feishu_open_id || row.openId || "").trim(),
    unionId: String(row.feishu_union_id || row.unionId || "").trim(),
    name: String(row.name || "").trim(),
    department: String(row.department || "").trim(),
    avatar: String(row.avatar_url || row.avatar || "").trim(),
    status: String(row.status || "active").trim() || "active",
    roles,
  };
}

function normalizePayloadUser(payload = {}) {
  const id = String(payload.id || payload.userId || payload.openId || payload.unionId || "").trim();
  if (!id) {
    throw createHttpError(400, "user id is required.");
  }
  const roles = normalizeRoles(payload.roles || payload.role || []);
  if (!roles.length) {
    throw createHttpError(400, "at least one valid role is required.");
  }
  return {
    id,
    openId: String(payload.openId || payload.feishuOpenId || "").trim(),
    unionId: String(payload.unionId || payload.feishuUnionId || "").trim(),
    name: String(payload.name || payload.displayName || "未命名用户").trim(),
    department: String(payload.department || "").trim(),
    avatar: String(payload.avatar || payload.avatarUrl || payload.photo || "").trim(),
    status: String(payload.status || "active").trim() || "active",
    roles,
    source: String(payload.source || "admin").trim() || "admin",
  };
}

function createMysqlUserRoleRepository(pool) {
  if (!pool || typeof pool.execute !== "function") {
    throw new Error("A mysql2-compatible pool with execute(sql, params) is required.");
  }

  async function listUsers() {
    const [rows] = await pool.execute(
      `SELECT u.id, u.feishu_open_id, u.feishu_union_id, u.name, u.department, u.avatar_url, u.status,
        GROUP_CONCAT(ra.role ORDER BY ra.role ASC SEPARATOR ',') AS roles
       FROM users u
       LEFT JOIN role_assignments ra
        ON ra.user_id = u.id AND ra.status = 'active'
       WHERE u.status = 'active'
       GROUP BY u.id, u.feishu_open_id, u.feishu_union_id, u.name, u.department, u.avatar_url, u.status
       ORDER BY u.updated_at DESC, u.id ASC`,
    );
    return {
      users: rows.map(normalizeRowUser),
    };
  }

  async function upsertUser(payload = {}) {
    const user = normalizePayloadUser(payload);
    await pool.execute(
      `INSERT INTO users (id, feishu_open_id, feishu_union_id, name, department, avatar_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        feishu_open_id = VALUES(feishu_open_id),
        feishu_union_id = VALUES(feishu_union_id),
        name = VALUES(name),
        department = VALUES(department),
        avatar_url = VALUES(avatar_url),
        status = VALUES(status),
        updated_at = CURRENT_TIMESTAMP`,
      [user.id, user.openId || null, user.unionId || null, user.name, user.department, user.avatar, user.status],
    );
    await pool.execute(
      "UPDATE role_assignments SET status = 'disabled', updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
      [user.id],
    );
    await Promise.all(user.roles.map((role) => pool.execute(
      `INSERT INTO role_assignments (user_id, role, source, status)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        source = VALUES(source),
        status = VALUES(status),
        updated_at = CURRENT_TIMESTAMP`,
      [user.id, role, user.source, "active"],
    )));

    const state = await listUsers();
    return state.users.find((item) => item.id === user.id) || { ...user, roles: user.roles };
  }

  // 只认飞书 user_id（不再用 openid/unionid 兜底匹配）。
  async function resolveLoginUser(payload = {}) {
    const userId = String(payload.userId || payload.id || "").trim();
    if (!userId) {
      return null;
    }
    const state = await listUsers();
    const user = state.users.find((item) => item.id === userId);
    if (!user || !user.roles.length) {
      return null;
    }

    return {
      user,
      roles: user.roles,
      role: user.roles[0],
    };
  }

  // 返回 { user:{id,name,department,avatar}, roles:[...] }，无角色则 roles 为空数组。
  async function getUserWithRoles(userId) {
    const id = String(userId || "").trim();
    if (!id) {
      return null;
    }
    const state = await listUsers();
    const found = state.users.find((item) => item.id === id);
    if (!found) {
      return null;
    }
    return {
      user: {
        id: found.id,
        name: found.name,
        department: found.department,
        avatar: found.avatar,
      },
      roles: found.roles || [],
    };
  }

  // 登录时把飞书身份(user_id+姓名+头像)同步进 users 表，不改角色（角色由管理员派发）。
  async function upsertLoginUser(payload = {}) {
    const id = String(payload.userId || payload.id || "").trim();
    if (!id) {
      throw createHttpError(400, "feishu user_id is required.");
    }
    const name = String(payload.name || payload.displayName || "飞书用户").trim();
    const department = String(payload.department || "").trim();
    const avatar = String(payload.avatar || payload.avatarUrl || payload.photo || "").trim();

    await pool.execute(
      `INSERT INTO users (id, name, department, avatar_url, status)
       VALUES (?, ?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        department = CASE WHEN VALUES(department) <> '' THEN VALUES(department) ELSE department END,
        avatar_url = CASE WHEN VALUES(avatar_url) <> '' THEN VALUES(avatar_url) ELSE avatar_url END,
        status = 'active',
        updated_at = CURRENT_TIMESTAMP`,
      [id, name, department, avatar],
    );

    return getUserWithRoles(id);
  }

  return {
    listUsers,
    resolveLoginUser,
    upsertUser,
    upsertLoginUser,
    getUserWithRoles,
  };
}

module.exports = {
  createMysqlUserRoleRepository,
};
