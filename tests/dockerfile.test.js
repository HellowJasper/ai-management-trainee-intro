const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Dockerfile installs runtime npm dependencies inside the image", () => {
  const dockerfile = fs.readFileSync(path.join(__dirname, "../Dockerfile"), "utf8");

  assert.match(dockerfile, /COPY package\*\.json \.\//);
  assert.match(dockerfile, /RUN npm install --omit=dev/);
  assert.match(dockerfile, /COPY \. \./);
});
