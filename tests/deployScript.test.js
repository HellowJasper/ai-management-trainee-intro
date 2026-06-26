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

test("deploy script builds from a clean checkout and stops on remote failures", () => {
  const script = fs.readFileSync(path.join(__dirname, "../deploy_to_88.sh"), "utf8");

  assert.match(script, /^set -euo pipefail/m);
  assert.match(script, /set -euo pipefail/);
  assert.match(script, /mktemp -d \/tmp\/ai-intro-release-XXXXXX/);
  assert.match(script, /git clone --depth 1 --branch main "\\\$REPO_URL" "\\\$RELEASE_DIR"/);
  assert.match(script, /docker build -t "\\\$IMAGE_NAME:latest" "\\\$RELEASE_DIR"/);
  assert.doesNotMatch(script, /cd ai-management-trainee-intro\s*\n\s*git pull/);
});
