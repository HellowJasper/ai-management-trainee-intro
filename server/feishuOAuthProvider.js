const DEFAULT_AUTHORIZE_URL = "https://accounts.feishu.cn/open-apis/authen/v1/authorize";
const DEFAULT_TOKEN_URL = "https://open.feishu.cn/open-apis/authen/v1/oidc/access_token";
const DEFAULT_USER_INFO_URL = "https://open.feishu.cn/open-apis/authen/v1/user_info";

function envValue(env, key) {
  return String(env[key] || "").trim();
}

function pickToken(payload = {}) {
  return payload.access_token
    || payload.user_access_token
    || payload.data?.access_token
    || payload.data?.user_access_token
    || "";
}

function pickUserInfo(payload = {}) {
  return payload.data?.user_info || payload.data || payload.user_info || payload;
}

function normalizeFeishuUser(user = {}) {
  const openId = String(user.open_id || user.openId || user.sub || "").trim();
  const unionId = String(user.union_id || user.unionId || "").trim();
  return {
    id: String(user.user_id || user.userId || openId || unionId || "").trim(),
    openId,
    unionId,
    name: String(user.name || user.display_name || user.en_name || "飞书用户").trim(),
    department: String(user.department || user.department_name || "").trim(),
    avatar: String(user.avatar_url || user.avatar || user.picture || "").trim(),
  };
}

async function requestJson(fetchImpl, url, options) {
  const response = await fetchImpl(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || (payload.code && payload.code !== 0)) {
    const error = new Error(payload.msg || payload.message || `Feishu OAuth request failed with status ${response.status}.`);
    error.statusCode = 502;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function createFeishuOAuthProvider({
  env = process.env,
  fetchImpl = globalThis.fetch,
  authorizeUrl = envValue(env, "FEISHU_AUTHORIZE_URL") || DEFAULT_AUTHORIZE_URL,
  tokenUrl = envValue(env, "FEISHU_TOKEN_URL") || DEFAULT_TOKEN_URL,
  userInfoUrl = envValue(env, "FEISHU_USER_INFO_URL") || DEFAULT_USER_INFO_URL,
  appId = envValue(env, "FEISHU_APP_ID"),
  appSecret = envValue(env, "FEISHU_APP_SECRET"),
  redirectUri = envValue(env, "FEISHU_REDIRECT_URI"),
} = {}) {
  const configured = Boolean(appId && appSecret && redirectUri && fetchImpl);

  function createAuthorizationUrl({ state, redirectUri: requestRedirectUri = redirectUri } = {}) {
    const url = new URL(authorizeUrl);
    url.searchParams.set("app_id", appId);
    url.searchParams.set("redirect_uri", requestRedirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", String(state || ""));
    return url.toString();
  }

  async function exchangeCodeForUser({ code, redirectUri: requestRedirectUri = redirectUri } = {}) {
    const cleanCode = String(code || "").trim();
    if (!configured) {
      const error = new Error("Feishu OAuth is not configured.");
      error.statusCode = 503;
      throw error;
    }
    if (!cleanCode) {
      const error = new Error("OAuth code is required.");
      error.statusCode = 400;
      throw error;
    }

    const tokenPayload = await requestJson(fetchImpl, tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: cleanCode,
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: requestRedirectUri,
      }),
    });
    const token = pickToken(tokenPayload);
    if (!token) {
      const error = new Error("Feishu OAuth token response did not include a user access token.");
      error.statusCode = 502;
      throw error;
    }

    const userPayload = await requestJson(fetchImpl, userInfoUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
    const user = normalizeFeishuUser(pickUserInfo(userPayload));
    if (!user.openId && !user.unionId && !user.id) {
      const error = new Error("Feishu user info response did not include a user identifier.");
      error.statusCode = 502;
      throw error;
    }
    return user;
  }

  return {
    configured,
    createAuthorizationUrl,
    exchangeCodeForUser,
    redirectUri,
  };
}

module.exports = {
  createFeishuOAuthProvider,
  normalizeFeishuUser,
};
