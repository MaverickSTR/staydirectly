import { PoolConfig } from "pg";
import { parse } from "pg-connection-string";
import dotenv from "dotenv";
dotenv.config();

// Helper to get PG connection config based on environment
export function getDbConfig(): PoolConfig {
  const mode = process.env.APP_ENV;
  const appMode = mode || "development"; // Default to development if not set

  console.log(`Running in ${appMode} mode.`);

  if (appMode === "development" || appMode === "test") {
    // Check if we have DATABASE_URL first (priority)
    if (process.env.DATABASE_URL) {
      console.log("Using DATABASE_URL for database connection");
      const parsed = parse(process.env.DATABASE_URL);
      if (parsed.database === null) {
        parsed.database = undefined;
      }
      return parsed as PoolConfig;
    }

    // Otherwise, use individual values from .env for development
    const requiredVars = ["PG_HOST", "PG_DATABASE", "PG_USER", "PG_PASSWORD"];
    const missingVars = requiredVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      missingVars.forEach((varName) => {
        console.error(`   ${varName} is not set`);
      });

      throw new Error(
        `Missing required environment variables: ${missingVars.join(", ")}`
      );
    }

    const dbVars = {
      user: process.env.PG_USER,
      host: process.env.PG_HOST,
      database: process.env.PG_DATABASE,
      password: process.env.PG_PASSWORD,
      port: process.env.PG_PORT ? Number(process.env.PG_PORT) : 5432,
    };

    console.log(
      `Connecting to database: ${dbVars.host}:${dbVars.port}/${dbVars.database} as ${dbVars.user}`
    );
    return dbVars;
  } else {
    // In production or staging, use the full DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not defined in production mode.");
    }

    const parsed = parse(databaseUrl);
    // Ensure 'database' is never null (convert null to undefined)
    if (parsed.database === null) {
      parsed.database = undefined;
    }
    return parsed as PoolConfig;
  }
}
