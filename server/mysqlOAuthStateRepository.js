const crypto = require("node:crypto");

const DEFAULT_TTL_MS = 10 * 60 * 1000;

function createStateToken() {
  return crypto.randomBytes(24).toString("hex");
}

// MySQL-backed OAuth state store. Mirrors createOAuthStateRepository() in
// oauthStateRepository.js (same createState/consumeState one-time-use + TTL
// contract) but persists state in the oauth_states table — no local files.
// TTL is evaluated entirely in SQL (DATE_ADD/NOW) to stay correct regardless of
// the JS<->MySQL session timezone.
function createMysqlOAuthStateRepository(pool, { ttlMs = DEFAULT_TTL_MS } = {}) {
  if (!pool || typeof pool.execute !== "function") {
    throw new Error("A mysql2-compatible pool with execute(sql, params) is required.");
  }

  const ttlSeconds = Math.max(1, Math.floor(Number(ttlMs) / 1000) || DEFAULT_TTL_MS / 1000);

  async function createState(payload = {}) {
    const now = new Date();
    const record = {
      state: createStateToken(),
      provider: String(payload.provider || "feishu").trim(),
      redirectPath: String(payload.redirectPath || "/site.html#me").trim(),
      redirectUri: String(payload.redirectUri || "").trim(),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
    };

    await pool.execute(
      `INSERT INTO oauth_states (state, provider, redirect_path, redirect_uri, expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))`,
      [record.state, record.provider, record.redirectPath, record.redirectUri, ttlSeconds],
    );

    return record;
  }

  async function consumeState(state) {
    const cleanState = String(state || "").trim();
    if (!cleanState) {
      return null;
    }

    const [rows] = await pool.execute(
      `SELECT state, provider, redirect_path, redirect_uri, (expires_at > NOW()) AS valid
       FROM oauth_states WHERE state = ? LIMIT 1`,
      [cleanState],
    );
    // One-time use: always delete on consume, whether valid or expired.
    await pool.execute("DELETE FROM oauth_states WHERE state = ?", [cleanState]);

    if (!rows.length || !Number(rows[0].valid)) {
      return null;
    }

    const row = rows[0];
    return {
      state: row.state,
      provider: row.provider,
      redirectPath: row.redirect_path,
      redirectUri: row.redirect_uri,
    };
  }

  return {
    consumeState,
    createState,
  };
}

module.exports = {
  createMysqlOAuthStateRepository,
};
