const fs = require("node:fs/promises");
const path = require("node:path");
const { createMysqlPool } = require("./mysqlClient");
const { normalizeRoles } = require("./userRoleRepository");

const DEFAULT_BACKUP_ROOT = path.join(__dirname, "../docs/user-import-backups");
const DEFAULT_NAME = "未命名用户";
const DEFAULT_CHUNK_SIZE = 500;

const FIELD_ALIASES = {
  id: [
    "id",
    "user_id",
    "userid",
    "user id",
    "用户id",
    "用户 ID",
    "飞书用户id",
    "飞书 user_id",
    "飞书账号",
    "账号",
    "工号",
    "员工id",
    "employee_id",
    "employee id",
  ],
  openId: ["open_id", "openid", "open id", "feishu_open_id", "飞书open_id"],
  unionId: ["union_id", "unionid", "union id", "feishu_union_id", "飞书union_id"],
  name: ["name", "display_name", "display name", "姓名", "名字", "用户名", "用户名称", "名称"],
  department: ["department", "dept", "部门", "部门名称", "所属部门", "部门路径"],
  roles: ["role", "roles", "角色", "系统角色", "身份", "权限", "用户角色"],
  avatar: ["avatar", "avatar_url", "avatar url", "photo", "头像", "头像url", "照片"],
  status: ["status", "状态", "用户状态"],
};

const ROLE_ALIASES = new Map([
  ["admin", "admin"],
  ["administrator", "admin"],
  ["管理员", "admin"],
  ["管理", "admin"],
  ["judge", "judge"],
  ["expert", "judge"],
  ["评委", "judge"],
  ["专家", "judge"],
  ["专家评委", "judge"],
  ["player", "player"],
  ["contestant", "player"],
  ["participant", "player"],
  ["选手", "player"],
  ["参赛者", "player"],
  ["队员", "player"],
  ["public", "public"],
  ["audience", "public"],
  ["viewer", "public"],
  ["观众", "public"],
  ["公众", "public"],
]);

const ALIAS_TO_FIELD = Object.entries(FIELD_ALIASES).reduce((map, [field, aliases]) => {
  aliases.forEach((alias) => map.set(normalizeHeader(alias), field));
  return map;
}, new Map());

function clean(value) {
  return String(value || "").trim();
}

function compactDate(date = new Date()) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function timestampForPath(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function defaultSource() {
  return `csv-import-${compactDate()}`;
}

function normalizeHeader(value) {
  return clean(value)
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[\s_\-()（）/\\]+/g, "");
}

function parseCsvRecords(text) {
  const input = String(text || "").replace(/^\uFEFF/, "");
  const records = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  function pushCell() {
    row.push(cell);
    cell = "";
  }

  function pushRow() {
    pushCell();
    records.push(row);
    row = [];
  }

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (inQuotes) {
      if (char === '"' && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      pushCell();
    } else if (char === "\n") {
      pushRow();
    } else if (char === "\r") {
      pushRow();
      if (input[index + 1] === "\n") {
        index += 1;
      }
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    pushRow();
  }

  return records.filter((record) => record.some((value) => clean(value)));
}

function createHeaderMap(headers) {
  const headerMap = {};
  headers.forEach((header, index) => {
    const field = ALIAS_TO_FIELD.get(normalizeHeader(header));
    if (field && typeof headerMap[field] === "undefined") {
      headerMap[field] = index;
    }
  });
  return headerMap;
}

function cellAt(row, headerMap, field) {
  const index = headerMap[field];
  return typeof index === "number" ? clean(row[index]) : "";
}

function normalizeRoleToken(token) {
  const normalizedToken = clean(token).toLowerCase();
  if (!normalizedToken) {
    return "";
  }
  const aliased = ROLE_ALIASES.get(normalizedToken) || ROLE_ALIASES.get(clean(token)) || normalizedToken;
  return normalizeRoles([aliased])[0] || "";
}

function parseRolesCell(value, defaultRole = "public") {
  const raw = clean(value);
  if (!raw) {
    const fallbackRole = normalizeRoleToken(defaultRole) || "public";
    return {
      roles: normalizeRoles([fallbackRole]),
      invalidRoles: [],
      hasExplicitRoles: false,
    };
  }

  const roles = [];
  const invalidRoles = [];
  raw.split(/[;,，；、/|]+|\s+/)
    .map(clean)
    .filter(Boolean)
    .forEach((token) => {
      const role = normalizeRoleToken(token);
      if (role) {
        roles.push(role);
      } else {
        invalidRoles.push(token);
      }
    });

  return {
    roles: normalizeRoles(roles),
    invalidRoles,
    hasExplicitRoles: true,
  };
}

function parseUserCsv(csvText, { defaultRole = "public" } = {}) {
  const records = parseCsvRecords(csvText);
  const errors = [];
  const duplicates = [];
  if (!records.length) {
    return {
      users: [],
      errors: [{ rowNumber: 0, code: "empty_csv", message: "CSV is empty." }],
      duplicates,
      totalRows: 0,
      headerMap: {},
    };
  }

  const [headers, ...rows] = records;
  const headerMap = createHeaderMap(headers);
  if (typeof headerMap.id === "undefined") {
    errors.push({
      rowNumber: 1,
      code: "missing_user_id_header",
      message: "CSV must include a user_id column.",
    });
  }

  const seenIds = new Set();
  const users = [];
  let totalRows = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    if (!row.some((value) => clean(value))) {
      return;
    }
    totalRows += 1;

    const id = cellAt(row, headerMap, "id");
    if (!id) {
      errors.push({
        rowNumber,
        code: "missing_user_id",
        message: "Missing user_id.",
      });
      return;
    }
    if (seenIds.has(id)) {
      duplicates.push({
        rowNumber,
        id,
        message: `Duplicate user_id: ${id}.`,
      });
      return;
    }
    seenIds.add(id);

    const roleValue = cellAt(row, headerMap, "roles");
    const roleResult = parseRolesCell(roleValue, defaultRole);
    if (roleResult.invalidRoles.length) {
      errors.push({
        rowNumber,
        code: "invalid_role",
        id,
        message: `Invalid role: ${roleResult.invalidRoles.join(", ")}.`,
      });
      return;
    }

    users.push({
      id,
      openId: cellAt(row, headerMap, "openId"),
      unionId: cellAt(row, headerMap, "unionId"),
      name: cellAt(row, headerMap, "name") || DEFAULT_NAME,
      department: cellAt(row, headerMap, "department"),
      avatar: cellAt(row, headerMap, "avatar"),
      status: cellAt(row, headerMap, "status") || "active",
      roles: roleResult.roles.length ? roleResult.roles : normalizeRoles([normalizeRoleToken(defaultRole) || "public"]),
      hasExplicitRoles: roleResult.hasExplicitRoles,
    });
  });

  return {
    users,
    errors,
    duplicates,
    totalRows,
    headerMap,
  };
}

function chunk(items, size = DEFAULT_CHUNK_SIZE) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function fetchExistingUsers(pool, userIds) {
  const existing = new Map();
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  for (const batch of chunk(ids)) {
    if (!batch.length) {
      continue;
    }
    const placeholders = batch.map(() => "?").join(", ");
    const [rows] = await pool.execute(
      `SELECT id, feishu_open_id, feishu_union_id, name, department, avatar_url, status
       FROM users
       WHERE id IN (${placeholders})`,
      batch,
    );
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      existing.set(clean(row.id), row);
    });
  }
  return existing;
}

function existingValue(row, ...keys) {
  for (const key of keys) {
    if (typeof row[key] !== "undefined") {
      return clean(row[key]);
    }
  }
  return "";
}

function userNeedsUpdate(user, existing) {
  if (!existing) {
    return false;
  }
  const comparisons = [
    [user.name !== DEFAULT_NAME ? user.name : "", existingValue(existing, "name")],
    [user.department, existingValue(existing, "department")],
    [user.avatar, existingValue(existing, "avatar_url", "avatar")],
    [user.openId, existingValue(existing, "feishu_open_id", "openId")],
    [user.unionId, existingValue(existing, "feishu_union_id", "unionId")],
    [user.status || "active", existingValue(existing, "status") || "active"],
  ];
  return comparisons.some(([nextValue, currentValue]) => clean(nextValue) && clean(nextValue) !== clean(currentValue));
}

async function createUserCsvImportPlan({ csvText, csvPath, pool, defaultRole = "public" } = {}) {
  const sourceText = typeof csvText === "string"
    ? csvText
    : await fs.readFile(path.resolve(csvPath), "utf8");
  const parsed = parseUserCsv(sourceText, { defaultRole });
  const existingById = pool
    ? await fetchExistingUsers(pool, parsed.users.map((user) => user.id))
    : new Map();
  const insertUsers = parsed.users.filter((user) => !existingById.has(user.id));
  const updateUsers = parsed.users.filter((user) => userNeedsUpdate(user, existingById.get(user.id)));
  const explicitRoleUsers = parsed.users.filter((user) => user.hasExplicitRoles);
  const defaultRoleUsers = parsed.users.filter((user) => !user.hasExplicitRoles);
  const roleAssignments = parsed.users.reduce((sum, user) => sum + user.roles.length, 0);

  return {
    users: parsed.users,
    errors: parsed.errors,
    duplicates: parsed.duplicates,
    totalRows: parsed.totalRows,
    validUsers: parsed.users.length,
    existingUsers: existingById.size,
    insertUsers: insertUsers.length,
    updateUsers: updateUsers.length,
    explicitRoleUsers: explicitRoleUsers.length,
    defaultRoleUsers: defaultRoleUsers.length,
    roleAssignments,
    rolePolicy: "Empty role cells add the default role without disabling existing roles; explicit role cells replace active roles for those users.",
  };
}

function assertExecutablePlan(plan) {
  const problems = [];
  if (plan.errors.length) {
    problems.push(`CSV has ${plan.errors.length} error${plan.errors.length === 1 ? "" : "s"}`);
  }
  if (plan.duplicates.length) {
    problems.push(`CSV has ${plan.duplicates.length} duplicate user_id${plan.duplicates.length === 1 ? "" : "s"}`);
  }
  if (problems.length) {
    const error = new Error(`${problems.join(" and ")}. Run dry-run and fix the CSV before execute.`);
    error.details = {
      errors: plan.errors,
      duplicates: plan.duplicates,
    };
    throw error;
  }
}

async function writeBackup(pool, backupRoot = DEFAULT_BACKUP_ROOT) {
  const backupDir = path.join(path.resolve(backupRoot), timestampForPath());
  await fs.mkdir(backupDir, { recursive: true });
  const [users] = await pool.execute("SELECT * FROM users ORDER BY id ASC");
  const [roleAssignments] = await pool.execute("SELECT * FROM role_assignments ORDER BY user_id ASC, role ASC");
  await fs.writeFile(path.join(backupDir, "users.json"), `${JSON.stringify(users || [], null, 2)}\n`);
  await fs.writeFile(
    path.join(backupDir, "role_assignments.json"),
    `${JSON.stringify(roleAssignments || [], null, 2)}\n`,
  );
  return backupDir;
}

async function bulkUpsertUsers(pool, users) {
  for (const batch of chunk(users, 200)) {
    if (!batch.length) {
      continue;
    }
    const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
    const params = batch.flatMap((user) => [
      user.id,
      user.openId || null,
      user.unionId || null,
      user.name || DEFAULT_NAME,
      user.department || "",
      user.avatar || null,
      user.status || "active",
    ]);
    await pool.execute(
      `INSERT INTO users (id, feishu_open_id, feishu_union_id, name, department, avatar_url, status)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE
        feishu_open_id = COALESCE(VALUES(feishu_open_id), feishu_open_id),
        feishu_union_id = COALESCE(VALUES(feishu_union_id), feishu_union_id),
        name = CASE
          WHEN VALUES(name) <> '' AND VALUES(name) <> '${DEFAULT_NAME}' THEN VALUES(name)
          ELSE name
        END,
        department = CASE WHEN VALUES(department) <> '' THEN VALUES(department) ELSE department END,
        avatar_url = CASE WHEN VALUES(avatar_url) IS NOT NULL AND VALUES(avatar_url) <> '' THEN VALUES(avatar_url) ELSE avatar_url END,
        status = VALUES(status),
        updated_at = CURRENT_TIMESTAMP`,
      params,
    );
  }
}

async function bulkDisableExplicitRoles(pool, users) {
  const ids = users.map((user) => user.id);
  for (const batch of chunk(ids, 800)) {
    if (!batch.length) {
      continue;
    }
    const placeholders = batch.map(() => "?").join(", ");
    await pool.execute(
      `UPDATE role_assignments SET status = 'disabled', updated_at = CURRENT_TIMESTAMP
       WHERE user_id IN (${placeholders})`,
      batch,
    );
  }
}

async function bulkUpsertRoles(pool, users, source) {
  const assignments = users.flatMap((user) => user.roles.map((role) => ({
    userId: user.id,
    role,
  })));
  for (const batch of chunk(assignments, 500)) {
    if (!batch.length) {
      continue;
    }
    const placeholders = batch.map(() => "(?, ?, ?, 'active')").join(", ");
    const params = batch.flatMap((assignment) => [assignment.userId, assignment.role, source]);
    await pool.execute(
      `INSERT INTO role_assignments (user_id, role, source, status)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE
        source = VALUES(source),
        status = VALUES(status),
        updated_at = CURRENT_TIMESTAMP`,
      params,
    );
  }
  return assignments.length;
}

async function insertAuditLog(pool, plan, source) {
  await pool.execute(
    `INSERT INTO audit_logs (actor, action, target_type, target_id, message, after_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      source,
      "users.csv.imported",
      "users",
      "csv",
      `CSV user import: ${plan.validUsers} users`,
      JSON.stringify({
        totalRows: plan.totalRows,
        validUsers: plan.validUsers,
        insertUsers: plan.insertUsers,
        updateUsers: plan.updateUsers,
        explicitRoleUsers: plan.explicitRoleUsers,
        defaultRoleUsers: plan.defaultRoleUsers,
        roleAssignments: plan.roleAssignments,
      }),
    ],
  );
}

async function withTransaction(pool, task) {
  if (!pool || typeof pool.getConnection !== "function") {
    return task(pool);
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await task(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function executeUserCsvImport(pool, plan, { source, backupDir }) {
  assertExecutablePlan(plan);
  const resolvedBackupDir = backupDir === false ? "" : await writeBackup(pool, backupDir || DEFAULT_BACKUP_ROOT);
  const explicitUsers = plan.users.filter((user) => user.hasExplicitRoles);

  const roleAssignments = await withTransaction(pool, async (client) => {
    await bulkUpsertUsers(client, plan.users);
    await bulkDisableExplicitRoles(client, explicitUsers);
    const assignmentCount = await bulkUpsertRoles(client, plan.users, source);
    await insertAuditLog(client, plan, source);
    return assignmentCount;
  });

  return {
    ...plan,
    mode: "execute",
    source,
    backupDir: resolvedBackupDir,
    roleAssignments,
  };
}

async function importUsersFromCsv({
  csvPath,
  csvText,
  pool,
  createPool = createMysqlPool,
  execute = false,
  backupDir,
  source = defaultSource(),
  defaultRole = "public",
} = {}) {
  if (!csvPath && typeof csvText !== "string") {
    throw new Error("csvPath or csvText is required.");
  }
  const activePool = pool || createPool();
  const ownsPool = !pool;

  try {
    const plan = await createUserCsvImportPlan({
      csvPath,
      csvText,
      pool: activePool,
      defaultRole,
    });
    if (!execute) {
      return {
        ...plan,
        mode: "dry-run",
        source,
      };
    }
    return executeUserCsvImport(activePool, plan, {
      source,
      backupDir,
    });
  } finally {
    if (ownsPool && activePool && typeof activePool.end === "function") {
      await activePool.end();
    }
  }
}

module.exports = {
  createUserCsvImportPlan,
  importUsersFromCsv,
  parseUserCsv,
};
