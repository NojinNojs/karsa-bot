import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config.
 * Schema lives in src/db/schema.ts, SQLite file at ./data/kota-mandiri.sqlite.
 * `bun run db:push` applies the schema without a migration history (fast local dev);
 * `bun run db:generate` emits SQL migrations for production/PostgreSQL migration paths.
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? "./data/kota-mandiri.sqlite",
  },
  verbose: true,
  strict: true,
});
