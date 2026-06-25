const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_ENV_PATH = path.join(__dirname, "..", ".env");

function parseEnv(raw) {
  const values = {};

  String(raw || "")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return;
      }

      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        return;
      }

      const key = trimmed.slice(0, separator).trim();
      if (!key) {
        return;
      }

      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      values[key] = value;
    });

  return values;
}

// Load a .env file into process.env without overriding anything already set
// (inline `KEY=value node ...`, Docker `-e`, or Vercel dashboard vars win).
function loadEnv(envPath = DEFAULT_ENV_PATH) {
  let raw;
  try {
    raw = fs.readFileSync(envPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    throw error;
  }

  const parsed = parseEnv(raw);
  Object.entries(parsed).forEach(([key, value]) => {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  });

  return parsed;
}

module.exports = {
  loadEnv,
  parseEnv,
};
