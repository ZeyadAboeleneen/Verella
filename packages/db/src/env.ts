import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Loads the single monorepo-root .env so `pnpm db:*` scripts and the Next.js
// app (apps/web) share one source of truth locally. In Docker, env_file
// injects real process env vars directly, so this is a no-op there.
const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(here, "../../../.env") });
