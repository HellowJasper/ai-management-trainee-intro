const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { createFeishuOAuthProvider } = require("./feishuOAuthProvider");
const { createOAuthStateRepository } = require("./oauthStateRepository");
const { createAuthSessionRepository } = require("./authSessionRepository");
const { createAuthSessionRepositoryFromEnv } = require("./redisAuthSessionRepository");
const { createRepositoryBundle } = require("./repositoryFactory");
const { buildFinalResultSnapshot } = require("./resultSnapshotService");
const { getRolePermissions } = require("../src/logic");

const DEFAULT_PUBLIC_ROOT = path.join(__dirname, "..");
const DEFAULT_PORT = 5173;
const SESSION_COOKIE_NAME = "joincare_session";
const DEFAULT_DEV_CORS_ORIGINS = new Set([
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function sendRedirect(response, location, headers = {}) {
  response.writeHead(302, {
    Location: location,
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end();
}

function configuredCorsOrigins() {
  const configured = String(process.env.CORS_ALLOW_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return configured.length ? new Set(configured) : DEFAULT_DEV_CORS_ORIGINS;
}

function isLocalhostOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function applyCorsHeaders(request, response) {
  const origin = request.headers.origin;
  if (!origin) {
    return;
  }

  const allowedOrigins = configuredCorsOrigins();
  if (!allowedOrigins.has(origin) && !isLocalhostOrigin(origin)) {
    return;
  }

  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  response.setHeader("Vary", "Origin");
}

function sendError(response, error) {
  const statusCode = error.statusCode || 500;
  sendJson(response, statusCode, {
    error: {
      message: error.message || "Internal server error.",
      statusCode,
    },
  });
}

function readJsonBody(request, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw) > maxBytes) {
        const error = new Error("Request body is too large.");
        error.statusCode = 413;
        reject(error);
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        error.statusCode = 400;
        error.message = "Request body must be valid JSON.";
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function decodePathname(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    const error = new Error("Invalid URL path.");
    error.statusCode = 400;
    throw error;
  }
}

function parseCookies(cookieHeader = "") {
  return String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separator = part.indexOf("=");
      if (separator === -1) {
        return cookies;
      }

      const key = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function getSessionIdFromRequest(request) {
  return parseCookies(request.headers.cookie || "")[SESSION_COOKIE_NAME] || "";
}

function buildSessionCookie(sessionId) {
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax`;
}

function buildExpiredSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function resolveAuthEnforcement(value = process.env.AUTH_ENFORCEMENT) {
  return String(value || "").trim().toLowerCase() === "strict" ? "strict" : null;
}

function sanitizeRedirectPath(value, fallback = "/site.html#me") {
  const redirectPath = String(value || "").trim();
  if (!redirectPath || !redirectPath.startsWith("/") || redirectPath.startsWith("//")) {
    return fallback;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(redirectPath)) {
    return fallback;
  }
  return redirectPath;
}

function buildExternalUrl(request, pathname) {
  const protocol = String(request.headers["x-forwarded-proto"] || "http").split(",")[0].trim() || "http";
  const host = String(request.headers["x-forwarded-host"] || request.headers.host || "localhost").split(",")[0].trim();
  return `${protocol}://${host}${pathname}`;
}

function isMobileRootRequest(request, url) {
  if (url.pathname !== "/" || url.searchParams.get("screen") === "big") {
    return false;
  }

  const userAgent = String(request.headers["user-agent"] || "");
  const mobileClientHint = String(request.headers["sec-ch-ua-mobile"] || "");

  return mobileClientHint.includes("?1")
    || /\b(Android|iPhone|iPad|iPod|Mobile|MicroMessenger|Lark|Feishu)\b/i.test(userAgent);
}

async function routeApi(
  request,
  response,
  url,
  repository,
  adminStateRepository,
  teamRepository,
  missionCountdownRepository,
  roadshowRepository,
  voteResultsRepository,
  judgeScoresRepository,
  worksRepository,
  auditLogRepository,
  resultSnapshotRepository,
  userRoleRepository,
  oauthStateRepository,
  feishuOAuthProvider,
  authSessionRepository,
  authEnforcement = null,
  runtimeInfo = {},
) {
  const segments = url.pathname.split("/").filter(Boolean);

  async function enforcePermission(request, response, permissionName) {
    if (authEnforcement !== "strict") {
      return { user: {}, role: "", permissions: {} };
    }
    const sessionId = getSessionIdFromRequest(request);
    const session = await authSessionRepository.getSession(sessionId);
    if (!session) {
      sendJson(response, 401, { error: { message: "Authentication required.", statusCode: 401 } });
      return null;
    }
    const perms = session.permissions || getRolePermissions(session.role);
    if (!perms[permissionName]) {
      sendJson(response, 403, { error: { message: `Required permission: ${permissionName}`, statusCode: 403 } });
      return null;
    }
    return session;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    });
    response.end();
    return true;
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    sendJson(response, 200, {
      status: "ok",
      runtime: {
        api: "server/index.js",
        dataBackend: runtimeInfo.dataBackend || "json",
      },
    });
    return true;
  }

  if (url.pathname === "/api/me" && request.method === "GET") {
    const session = await authSessionRepository.getSession(getSessionIdFromRequest(request));
    sendJson(response, 200, session
      ? {
          user: session.user,
          role: session.role,
          roles: session.roles || [session.role],
          permissions: session.permissions || getRolePermissions(session.role),
          source: session.source || "session",
        }
      : {
          user: null,
          role: null,
          permissions: [],
          source: "backend-pending",
        });
    return true;
  }

  if (url.pathname === "/api/permissions" && request.method === "GET") {
    const role = url.searchParams.get("role") || "";
    sendJson(response, 200, {
      role: role || null,
      permissions: role ? getRolePermissions(role) : {},
      source: "backend-pending",
    });
    return true;
  }

  if (url.pathname === "/api/auth/feishu/start" && request.method === "GET") {
    if (!feishuOAuthProvider.configured) {
      sendJson(response, 200, {
        configured: false,
        provider: "feishu",
        reason: "missing-oauth-config",
      });
      return true;
    }

    const redirectPath = sanitizeRedirectPath(url.searchParams.get("redirect"));
    const redirectUri = feishuOAuthProvider.redirectUri || buildExternalUrl(request, "/api/auth/feishu/callback");
    const stateRecord = await oauthStateRepository.createState({
      provider: "feishu",
      redirectPath,
      redirectUri,
    });
    const authorizationUrl = feishuOAuthProvider.createAuthorizationUrl({
      state: stateRecord.state,
      redirectUri,
    });
    sendRedirect(response, authorizationUrl);
    return true;
  }

  if (url.pathname === "/api/auth/feishu/callback" && request.method === "GET") {
    if (!feishuOAuthProvider.configured) {
      sendJson(response, 503, {
        error: {
          message: "Feishu OAuth is not configured.",
          statusCode: 503,
        },
      });
      return true;
    }

    const code = url.searchParams.get("code") || "";
    const state = url.searchParams.get("state") || "";
    const stateRecord = await oauthStateRepository.consumeState(state);
    if (!stateRecord) {
      sendJson(response, 400, {
        error: {
          message: "Invalid or expired OAuth state.",
          statusCode: 400,
        },
      });
      return true;
    }
    if (!code) {
      sendJson(response, 400, {
        error: {
          message: "OAuth code is required.",
          statusCode: 400,
        },
      });
      return true;
    }

    const feishuUser = await feishuOAuthProvider.exchangeCodeForUser({
      code,
      redirectUri: stateRecord.redirectUri,
    });
    const mapped = await userRoleRepository.resolveLoginUser(feishuUser);
    if (!mapped) {
      sendJson(response, 403, {
        error: {
          message: "Feishu user is not bound to a platform role.",
          statusCode: 403,
        },
        provider: "feishu",
      });
      return true;
    }

    const session = await authSessionRepository.createSession({
      ...mapped.user,
      role: mapped.role,
      roles: mapped.roles,
      source: "feishu-oauth",
    });
    sendRedirect(response, sanitizeRedirectPath(stateRecord.redirectPath), {
      "Set-Cookie": buildSessionCookie(session.id),
    });
    return true;
  }

  if (url.pathname === "/api/auth/feishu/login" && request.method === "POST") {
    const payload = await readJsonBody(request);
    if (!payload.role) {
      const mapped = await userRoleRepository.resolveLoginUser(payload);
      if (mapped) {
        const session = await authSessionRepository.createSession({
          ...mapped.user,
          role: mapped.role,
          roles: mapped.roles,
          source: "role-mapping",
        });
        sendJson(response, 200, {
          configured: true,
          provider: "feishu",
          authenticated: true,
          user: session.user,
          role: session.role,
          roles: session.roles,
          permissions: session.permissions,
          source: session.source,
        }, {
          "Set-Cookie": buildSessionCookie(session.id),
        });
        return true;
      }
      sendJson(response, 200, {
        configured: false,
        provider: "feishu",
      });
      return true;
    }

    const session = await authSessionRepository.createSession({
      ...payload,
      source: "local-dev",
    });
    sendJson(response, 200, {
      configured: true,
      provider: "feishu",
      authenticated: true,
      user: session.user,
      role: session.role,
      roles: session.roles,
      permissions: session.permissions,
      source: session.source,
    }, {
      "Set-Cookie": buildSessionCookie(session.id),
    });
    return true;
  }

  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    await authSessionRepository.deleteSession(getSessionIdFromRequest(request));
    sendJson(response, 200, {
      accepted: true,
    }, {
      "Set-Cookie": buildExpiredSessionCookie(),
    });
    return true;
  }

  if (url.pathname === "/api/admin/users" && request.method === "GET") {
    const session = await enforcePermission(request, response, "canAdmin");
    if (!session) return true;
    sendJson(response, 200, await userRoleRepository.listUsers());
    return true;
  }

  if (url.pathname === "/api/admin/users" && ["POST", "PATCH"].includes(request.method)) {
    const session = await enforcePermission(request, response, "canAdmin");
    if (!session) return true;
    const payload = await readJsonBody(request);
    if (authEnforcement === "strict") {
      payload.actor = session.user.id;
      payload.source = session.user.id;
    }
    const user = await userRoleRepository.upsertUser(payload);
    await auditLogRepository.record({
      actor: payload.actor || payload.source || "admin",
      action: "user.roles.updated",
      targetType: "user",
      targetId: user.id,
      message: `更新用户【${user.name || user.id}】角色`,
      after: user,
    });
    sendJson(response, 201, user);
    return true;
  }

  if (url.pathname === "/api/admin/team-members" && request.method === "POST") {
    const session = await enforcePermission(request, response, "canAdmin");
    if (!session) return true;
    const payload = await readJsonBody(request);
    const actor = authEnforcement === "strict" ? session.user.id : payload.actor || "admin";
    const result = await teamRepository.joinTeam(payload, { bypassStatus: true });
    await auditLogRepository.record({
      actor,
      action: "team.member.added",
      targetType: "team",
      targetId: result.team?.id || payload.teamId || "",
      message: `添加队员【${result.member?.name || result.member?.userId || "未命名成员"}】到【${result.team?.name || result.team?.id || payload.teamId}】`,
      meta: {
        teamId: result.team?.id || payload.teamId || "",
        userId: result.member?.userId || payload.userId || "",
      },
    });
    sendJson(response, 200, result);
    return true;
  }

  if (url.pathname === "/api/admin/team-members" && request.method === "DELETE") {
    const session = await enforcePermission(request, response, "canAdmin");
    if (!session) return true;
    const payload = await readJsonBody(request);
    const actor = authEnforcement === "strict" ? session.user.id : payload.actor || "admin";
    const result = await teamRepository.leaveTeam(payload);
    await auditLogRepository.record({
      actor,
      action: "team.member.removed",
      targetType: "team",
      targetId: result.team?.id || payload.teamId || "",
      message: `移除队员【${result.userId || payload.userId || "未知成员"}】从【${result.team?.name || result.team?.id || payload.teamId}】`,
      meta: {
        teamId: result.team?.id || payload.teamId || "",
        userId: result.userId || payload.userId || "",
      },
    });
    sendJson(response, 200, result);
    return true;
  }

  if (
    segments[0] === "api"
    && segments[1] === "admin"
    && segments[2] === "teams"
    && segments.length === 5
    && segments[4] === "status"
    && ["POST", "PATCH"].includes(request.method)
  ) {
    const session = await enforcePermission(request, response, "canAdmin");
    if (!session) return true;
    const payload = await readJsonBody(request);
    const actor = authEnforcement === "strict" ? session.user.id : payload.actor || "admin";
    const result = await teamRepository.updateTeamStatus(segments[3], payload);
    await auditLogRepository.record({
      actor,
      action: "team.status.updated",
      targetType: "team",
      targetId: result.team?.id || segments[3],
      message: `更新赛道【${result.team?.name || segments[3]}】状态为【${result.team?.status || payload.status}】`,
      after: result.team,
    });
    sendJson(response, 200, result);
    return true;
  }

  if (url.pathname === "/api/team/join" && request.method === "POST") {
    const session = await enforcePermission(request, response, "canJoinTeam");
    if (!session) return true;
    const payload = await readJsonBody(request);
    if (authEnforcement === "strict") {
      payload.userId = session.user.id;
      payload.name = session.user.name;
    }
    sendJson(response, 200, await teamRepository.joinTeam(payload));
    return true;
  }

  if (url.pathname === "/api/team/leave" && request.method === "POST") {
    const session = await enforcePermission(request, response, "canJoinTeam");
    if (!session) return true;
    const payload = await readJsonBody(request);
    if (authEnforcement === "strict") {
      payload.userId = session.user.id;
    }
    sendJson(response, 200, await teamRepository.leaveTeam(payload));
    return true;
  }

  if (url.pathname === "/api/team/claim-role" && request.method === "POST") {
    const session = await enforcePermission(request, response, "canJoinTeam");
    if (!session) return true;
    const payload = await readJsonBody(request);
    if (authEnforcement === "strict") {
      payload.userId = session.user.id;
    }
    sendJson(response, 200, await teamRepository.claimRole(payload));
    return true;
  }

  if (url.pathname === "/api/vote/cast" && request.method === "POST") {
    const session = await enforcePermission(request, response, "canVote");
    if (!session) return true;
    const payload = await readJsonBody(request);
    if (authEnforcement === "strict") {
      payload.userId = session.user.id;
    }
    sendJson(response, 200, await voteResultsRepository.castVote(payload));
    return true;
  }

  if (url.pathname === "/api/vote/cancel" && request.method === "POST") {
    const session = await enforcePermission(request, response, "canVote");
    if (!session) return true;
    const payload = await readJsonBody(request);
    if (authEnforcement === "strict") {
      payload.userId = session.user.id;
    }
    sendJson(response, 200, await voteResultsRepository.cancelVote(payload));
    return true;
  }

  if (url.pathname === "/api/judge/scores" && request.method === "POST") {
    const session = await enforcePermission(request, response, "canScore");
    if (!session) return true;
    const payload = await readJsonBody(request);
    if (authEnforcement === "strict") {
      payload.judgeId = session.user.id;
    }
    sendJson(response, 200, await judgeScoresRepository.saveScores(payload));
    return true;
  }

  if (url.pathname === "/api/judge/scores" && request.method === "GET") {
    sendJson(response, 200, await judgeScoresRepository.readState());
    return true;
  }

  if (url.pathname === "/api/works" && request.method === "GET") {
    sendJson(response, 200, await worksRepository.listWorks({ status: url.searchParams.get("status") }));
    return true;
  }

  if (url.pathname === "/api/work/submit" && request.method === "POST") {
    const session = await enforcePermission(request, response, "canSubmitWork");
    if (!session) return true;
    const payload = await readJsonBody(request);
    if (authEnforcement === "strict") {
      payload.userId = session.user.id;
      payload.submittedBy = session.user.id;
      payload.name = session.user.name;
    }
    const result = await worksRepository.submitWork(payload);
    await auditLogRepository.record({
      actor: payload.userId || payload.submittedBy || "system",
      action: "work.submitted",
      targetType: "work",
      targetId: result.work.id,
      message: `提交作品【${result.work.project || result.work.id}】`,
      after: result.work,
    });
    sendJson(response, 201, result);
    return true;
  }

  if (segments[0] === "api" && segments[1] === "works" && segments.length === 3 && request.method === "GET") {
    sendJson(response, 200, await worksRepository.getWork(segments[2]));
    return true;
  }

  if (
    segments[0] === "api"
    && segments[1] === "admin"
    && segments[2] === "works"
    && segments.length === 5
    && segments[4] === "status"
    && ["POST", "PATCH"].includes(request.method)
  ) {
    const session = await enforcePermission(request, response, "canAdmin");
    if (!session) return true;
    const payload = await readJsonBody(request);
    if (authEnforcement === "strict") {
      payload.reviewerId = session.user.id;
    }
    const result = await worksRepository.updateStatus(segments[3], payload);
    await auditLogRepository.record({
      actor: payload.reviewerId || payload.reviewedBy || "admin",
      action: "work.statusChanged",
      targetType: "work",
      targetId: result.work.id,
      message: `更新作品状态为【${result.work.status}】`,
      after: result.work,
    });
    sendJson(response, 200, result);
    return true;
  }

  if (url.pathname === "/api/admin/audit-logs" && request.method === "GET") {
    sendJson(response, 200, await auditLogRepository.listLogs({
      limit: url.searchParams.get("limit"),
    }));
    return true;
  }

  if (url.pathname === "/api/results/latest" && request.method === "GET") {
    const snapshot = await resultSnapshotRepository.getLatestSnapshot();
    sendJson(response, 200, {
      published: Boolean(snapshot),
      snapshot,
    });
    return true;
  }

  if (url.pathname === "/api/admin/results/publish" && ["POST", "PATCH"].includes(request.method)) {
    const session = await enforcePermission(request, response, "canAdmin");
    if (!session) return true;
    const payload = await readJsonBody(request);
    if (authEnforcement === "strict") {
      payload.actor = session.user.id;
    }
    const [voteState, judgeState] = await Promise.all([
      voteResultsRepository.listVoteResults(),
      judgeScoresRepository.readState(),
    ]);
    const snapshotPayload = buildFinalResultSnapshot({
      voteState,
      judgeState,
      publishedBy: payload.actor || payload.publishedBy || "admin",
    });
    const snapshot = await resultSnapshotRepository.publishSnapshot(snapshotPayload);

    await auditLogRepository.record({
      actor: snapshot.publishedBy,
      action: "result.published",
      targetType: "result",
      targetId: snapshot.id,
      message: `发布最终结果快照【${snapshot.id}】`,
      after: snapshot,
    });
    sendJson(response, 201, snapshot);
    return true;
  }

  if (url.pathname === "/api/admin/vote-window" && ["POST", "PATCH"].includes(request.method)) {
    const session = await enforcePermission(request, response, "canAdmin");
    if (!session) return true;
    const payload = await readJsonBody(request);
    if (authEnforcement === "strict") {
      payload.actor = session.user.id;
    }
    const state = await voteResultsRepository.updateWindowStatus(payload);

    await auditLogRepository.record({
      actor: payload.actor || "admin",
      action: "vote.window.updated",
      targetType: "vote",
      targetId: state.status,
      message: state.windowLabel || `更新投票窗口状态为【${state.status}】`,
      after: {
        status: state.status,
        windowLabel: state.windowLabel,
      },
    });
    sendJson(response, 200, state);
    return true;
  }

  if (url.pathname === "/api/admin/state" && request.method === "GET") {
    sendJson(response, 200, await adminStateRepository.getState());
    return true;
  }

  if (url.pathname === "/api/admin/stage" && ["POST", "PATCH"].includes(request.method)) {
    const session = await enforcePermission(request, response, "canAdmin");
    if (!session) return true;
    const payload = await readJsonBody(request);
    if (authEnforcement === "strict") {
      payload.actor = session.user.id;
    }
    const state = await adminStateRepository.setCurrentStage(payload.stageId);

    await auditLogRepository.record({
      actor: payload.actor || "admin",
      action: "stage.changed",
      targetType: "stage",
      targetId: state.currentStageId,
      message: `开启阶段【${state.stages.find((stage) => stage.id === state.currentStageId)?.name || state.currentStageId}】`,
    });
    sendJson(response, 200, state);
    return true;
  }

  if (url.pathname === "/api/admin/display-times" && ["POST", "PATCH"].includes(request.method)) {
    const session = await enforcePermission(request, response, "canAdmin");
    if (!session) return true;
    const payload = await readJsonBody(request);
    if (authEnforcement === "strict") {
      payload.actor = session.user.id;
    }
    const state = await adminStateRepository.updateDisplayTimes(payload);

    await auditLogRepository.record({
      actor: payload.actor || "admin",
      action: "stage.displayTimes.updated",
      targetType: "stage",
      targetId: "display-times",
      message: "更新时间显示配置",
    });
    sendJson(response, 200, state);
    return true;
  }

  if (url.pathname === "/api/admin/mission-countdown" && ["POST", "PATCH"].includes(request.method)) {
    const session = await enforcePermission(request, response, "canAdmin");
    if (!session) return true;
    const payload = await readJsonBody(request);
    if (authEnforcement === "strict") {
      payload.actor = session.user.id;
    }
    const state = await missionCountdownRepository.updateState(payload);

    await auditLogRepository.record({
      actor: payload.actor || "admin",
      action: "timer.missionCountdown.updated",
      targetType: "timer",
      targetId: "mission-countdown",
      message: state.startedAt ? "启动任务倒计时" : "重置任务倒计时",
    });
    sendJson(response, 200, state);
    return true;
  }

  if (url.pathname === "/api/admin/roadshow" && ["POST", "PATCH"].includes(request.method)) {
    const session = await enforcePermission(request, response, "canAdmin");
    if (!session) return true;
    const payload = await readJsonBody(request);
    if (authEnforcement === "strict") {
      payload.actor = session.user.id;
    }
    const state = await roadshowRepository.updateState(payload);

    await auditLogRepository.record({
      actor: payload.actor || "admin",
      action: "timer.roadshow.updated",
      targetType: "timer",
      targetId: "roadshow",
      message: state.startedAt ? "启动路演计时" : "重置路演计时",
    });
    sendJson(response, 200, state);
    return true;
  }

  if (url.pathname === "/api/teams" && request.method === "GET") {
    sendJson(response, 200, await teamRepository.listTeams());
    return true;
  }

  if (url.pathname === "/api/mission-countdown" && request.method === "GET") {
    sendJson(response, 200, await missionCountdownRepository.getState());
    return true;
  }

  if (url.pathname === "/api/mission-countdown/start" && request.method === "POST") {
    const payload = await readJsonBody(request);
    sendJson(response, 200, await missionCountdownRepository.startCountdown(payload));
    return true;
  }

  if (url.pathname === "/api/roadshow" && request.method === "GET") {
    sendJson(response, 200, await roadshowRepository.getState());
    return true;
  }

  if (url.pathname === "/api/roadshow/start" && request.method === "POST") {
    const payload = await readJsonBody(request);
    sendJson(response, 200, await roadshowRepository.startRoadshow(payload));
    return true;
  }

  if (url.pathname === "/api/vote-results" && request.method === "GET") {
    sendJson(response, 200, await voteResultsRepository.listVoteResults());
    return true;
  }

  if (segments[0] !== "api" || segments[1] !== "trainees") {
    return false;
  }

  if (segments.length === 2 && request.method === "GET") {
    sendJson(response, 200, await repository.listTrainees());
    return true;
  }

  if (segments.length === 2 && request.method === "POST") {
    const payload = await readJsonBody(request);
    sendJson(response, 201, await repository.createTrainee(payload));
    return true;
  }

  const id = segments[2];
  if (!id) {
    return false;
  }

  if (segments.length === 3 && request.method === "GET") {
    sendJson(response, 200, await repository.getTrainee(id));
    return true;
  }

  if (segments.length === 3 && request.method === "PATCH") {
    const payload = await readJsonBody(request);
    sendJson(response, 200, await repository.updateTrainee(id, payload));
    return true;
  }

  if (segments.length === 3 && request.method === "DELETE") {
    sendJson(response, 200, await repository.deleteTrainee(id));
    return true;
  }

  if (segments.length === 4 && segments[3] === "sentence" && ["POST", "PATCH"].includes(request.method)) {
    const payload = await readJsonBody(request);
    sendJson(response, 200, await repository.saveSentence(id, payload.sentence));
    return true;
  }

  return false;
}

function serveStatic(request, response, url, publicRoot) {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Method Not Allowed");
    return;
  }

  const decodedPathname = decodePathname(url.pathname);
  let requestPath = decodedPathname;
  if (isMobileRootRequest(request, url)) {
    requestPath = "/site.html";
  } else if (decodedPathname === "/") {
    requestPath = "/index.html";
  } else if (decodedPathname === "/admin" || decodedPathname === "/admin/") {
    requestPath = "/admin.html";
  }
  const filePath = path.resolve(publicRoot, `.${requestPath}`);

  if (!filePath.startsWith(`${publicRoot}${path.sep}`) && filePath !== publicRoot) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not Found");
      return;
    }

    const resolvedFilePath = stats.isDirectory() ? path.join(filePath, "index.html") : filePath;

    fs.stat(resolvedFilePath, (resolvedStatError, resolvedStats) => {
      if (resolvedStatError || !resolvedStats.isFile()) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not Found");
        return;
      }

      const extension = path.extname(resolvedFilePath).toLowerCase();

      response.writeHead(200, {
        "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      });

      if (request.method === "HEAD") {
        response.end();
        return;
      }

      const stream = fs.createReadStream(resolvedFilePath);
      stream.on("error", () => {
        if (!response.headersSent) {
          response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("Internal Server Error");
          return;
        }

        response.destroy();
      });
      stream.pipe(response);
    });
  });
}

function createServer(options = {}) {
  const repositoryBundle = (!options.repository
      || !options.teamRepository
      || !options.voteResultsRepository
      || !options.judgeScoresRepository
      || !options.worksRepository
      || !options.auditLogRepository
      || !options.missionCountdownRepository
      || !options.roadshowRepository
      || !options.adminStateRepository
      || !options.resultSnapshotRepository
      || !options.userRoleRepository)
    ? createRepositoryBundle({ dataBackend: options.dataBackend })
    : {};
  const {
    publicRoot = DEFAULT_PUBLIC_ROOT,
    repository = repositoryBundle.repository,
    adminStateRepository = repositoryBundle.adminStateRepository,
    teamRepository = repositoryBundle.teamRepository,
    missionCountdownRepository = repositoryBundle.missionCountdownRepository,
    roadshowRepository = repositoryBundle.roadshowRepository,
    voteResultsRepository = repositoryBundle.voteResultsRepository,
    judgeScoresRepository = repositoryBundle.judgeScoresRepository,
    worksRepository = repositoryBundle.worksRepository,
    auditLogRepository = repositoryBundle.auditLogRepository,
    resultSnapshotRepository = repositoryBundle.resultSnapshotRepository,
    userRoleRepository = repositoryBundle.userRoleRepository,
    oauthStateRepository = repositoryBundle.oauthStateRepository || createOAuthStateRepository(),
    feishuOAuthProvider = createFeishuOAuthProvider(),
    authSessionRepository = repositoryBundle.authSessionRepository || createAuthSessionRepository(),
    authEnforcement = resolveAuthEnforcement(),
  } = options;
  const resolvedPublicRoot = path.resolve(publicRoot);
  const runtimeInfo = {
    dataBackend: options.dataBackend || repositoryBundle.dataBackend || "custom",
  };

  return http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    try {
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
        applyCorsHeaders(request, response);
        const handled = await routeApi(
          request,
          response,
          url,
          repository,
          adminStateRepository,
          teamRepository,
          missionCountdownRepository,
          roadshowRepository,
          voteResultsRepository,
          judgeScoresRepository,
          worksRepository,
          auditLogRepository,
          resultSnapshotRepository,
          userRoleRepository,
          oauthStateRepository,
          feishuOAuthProvider,
          authSessionRepository,
          authEnforcement,
          runtimeInfo,
        );
        if (!handled) {
          sendJson(response, 404, {
            error: {
              message: "API route was not found.",
              statusCode: 404,
            },
          });
        }
        return;
      }

      serveStatic(request, response, url, resolvedPublicRoot);
    } catch (error) {
      sendError(response, error);
    }
  });
}

if (require.main === module) {
  require("./loadEnv").loadEnv();
  // 全盘 MySQL：禁止本地文件存储。未显式声明则强制 mysql；显式声明为其它后端则拒绝启动。
  if (process.env.DATA_BACKEND === undefined) {
    process.env.DATA_BACKEND = "mysql";
  }
  if (String(process.env.DATA_BACKEND).trim().toLowerCase() !== "mysql") {
    console.error(`此部署仅支持 MySQL 存储，请在 .env 设置 DATA_BACKEND=mysql（当前为 "${process.env.DATA_BACKEND}"）。`);
    process.exit(1);
  }
  const port = Number(process.env.PORT || DEFAULT_PORT);
  const server = createServer();

  server.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

module.exports = {
  createServer,
  resolveAuthEnforcement,
  routeApi,
  serveStatic,
};
