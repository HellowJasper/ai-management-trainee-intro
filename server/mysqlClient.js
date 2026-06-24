function createMysqlPool(config = {}) {
  let mysql;
  try {
    mysql = require("mysql2/promise");
  } catch (error) {
    const nextError = new Error("mysql2 is required when DATA_BACKEND=mysql. Run npm install before starting the API service.");
    nextError.cause = error;
    throw nextError;
  }

  const databaseUrl = config.databaseUrl || process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (databaseUrl) {
    return mysql.createPool(databaseUrl);
  }

  return mysql.createPool({
    host: config.host || process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(config.port || process.env.MYSQL_PORT || 3306),
    user: config.user || process.env.MYSQL_USER || "root",
    password: typeof config.password === "string" ? config.password : (process.env.MYSQL_PASSWORD || ""),
    database: config.database || process.env.MYSQL_DATABASE || "joincare_hackathon",
    waitForConnections: true,
    connectionLimit: Number(config.connectionLimit || process.env.MYSQL_CONNECTION_LIMIT || 10),
  });
}

module.exports = {
  createMysqlPool,
};
