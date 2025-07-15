import { defineConfig } from "drizzle-kit";

// Check for development or production DATABASE_URL
const databaseUrl = process.env.DATABASE_URL_DEV;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL_DEV or DATABASE_URL must be set in environment variables"
  );
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
