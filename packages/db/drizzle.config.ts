import { config } from "dotenv";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

// Shares the single monorepo-root .env (see src/env.ts for the runtime-script equivalent).
config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  dialect: "mysql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "mysql://root:root@localhost:3306/verella",
  },
  verbose: true,
  strict: true,
});
