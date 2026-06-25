const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("deploy script keeps the production container on MySQL backend", () => {
  const script = fs.readFileSync(path.join(__dirname, "../deploy_to_88.sh"), "utf8");

  assert.match(script, /DATA_BACKEND=mysql/);
  assert.match(script, /MYSQL_HOST=mysql/);
  assert.match(script, /MYSQL_DATABASE=ai_management_trainee_intro/);
  assert.match(script, /middleware-credentials\.txt/);
});
