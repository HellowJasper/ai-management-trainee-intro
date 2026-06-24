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

  async function resolveLoginUser(payload = {}) {
    const state = await listUsers();
    const userId = String(payload.userId || payload.id || "").trim();
    const openId = String(payload.openId || "").trim();
    const unionId = String(payload.unionId || "").trim();
    const user = state.users.find((item) => (
      (userId && item.id === userId)
      || (openId && item.openId === openId)
      || (unionId && item.unionId === unionId)
    ));
    if (!user || !user.roles.length) {
      return null;
    }

    return {
      user,
      roles: user.roles,
      role: user.roles[0],
    };
  }

  return {
    listUsers,
    resolveLoginUser,
    upsertUser,
  };
}

module.exports = {
  createMysqlUserRoleRepository,
};
