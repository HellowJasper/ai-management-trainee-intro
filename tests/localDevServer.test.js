const test = require("node:test");
const assert = require("node:assert/strict");
const { createLocalDevServer } = require("../server/localDevServer");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve(`http://127.0.0.1:${server.address().port}`);
    });
  });
}

test("local dev server uses JSON storage and allows local role login", async (t) => {
  const server = createLocalDevServer();
  t.after(() => server.close());
  const baseUrl = await listen(server);

  const healthResponse = await fetch(`${baseUrl}/api/health`);
  const health = await healthResponse.json();
  assert.equal(healthResponse.status, 200);
  assert.equal(health.runtime.dataBackend, "json");

  const indexResponse = await fetch(`${baseUrl}/index.html`, { redirect: "manual" });
  assert.equal(indexResponse.status, 200);
  assert.match(indexResponse.headers.get("content-type") || "", /text\/html/);

  const loginResponse = await fetch(`${baseUrl}/api/auth/feishu/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: "admin",
      userId: "local-admin",
      name: "本地管理员",
    }),
  });
  const login = await loginResponse.json();
  assert.equal(loginResponse.status, 200);
  assert.equal(login.source, "local-dev");
  assert.equal(login.role, "admin");
  assert.match(loginResponse.headers.get("set-cookie") || "", /joincare_session=/);
});
