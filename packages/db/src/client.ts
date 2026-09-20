import "./env";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __verellaDbPoolV3: mysql.Pool | undefined;
}

// mysql2 pools don't open a socket until the first query, so it's safe to
// create one even with a placeholder URL. Deliberately NOT throwing here:
// build tooling (e.g. `next build` collecting route metadata) imports route
// modules — which transitively import this file — without ever running a
// query, so an eager throw on a missing DATABASE_URL would break the build
// itself rather than surfacing at actual request time, where it belongs.
function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url && process.env.NODE_ENV !== "test") {
    console.warn("DATABASE_URL is not set — using a placeholder. Copy .env.example to .env and configure it before making real requests.");
  }
  // Tuned for the site4now shared-hosting MySQL, which enforces
  // wait_timeout=30s and max_user_connections=20: any connection idle longer
  // than 30s is killed server-side, and a pool that keeps many idle sockets
  // around hands out dead ones — the source of the intermittent "Failed
  // query" errors. connectionLimit:10 (tried previously to give headroom for
  // the homepage's several parallel queries) ended up holding too many
  // connections against the host's tight 20-connection cap, so this was
  // pulled down to connectionLimit:2 — but that turned out too tight: a
  // single homepage render fires far more than 2 concurrent queries (hero
  // slides, categories, best sellers, store products — several of which do
  // multiple sequential round-trips internally), so most of them piled up
  // waiting for one of 2 connections and started tripping the 12s
  // withDbTimeout race (see db-timeout.ts) — the actual cause of renders,
  // including a plain language switch, appearing to hang. connectionLimit:5
  // gives enough headroom for one dev/prod process's own concurrent queries
  // while still leaving comfortable room under the host's 20-connection cap
  // if something else is sharing it. maxIdle:1 still recycles idle sockets
  // aggressively so they don't sit around and get killed server-side, and
  // queueLimit:0 (unbounded) lets excess queries queue for a free connection
  // rather than being rejected outright.
  return mysql.createPool({
    uri: url ?? "mysql://placeholder:placeholder@localhost:3306/placeholder",
    connectionLimit: 5,
    maxIdle: 1,
    idleTimeout: 15_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    connectTimeout: 8_000,
    queueLimit: 0,
    dateStrings: false,
  });
}

// Reuse the pool across Next.js hot-reloads in dev. (Key is versioned so a
// config change here takes effect on hot-reload instead of reusing a pool
// built with stale options.)
const pool = globalThis.__verellaDbPoolV3 ?? createPool();
if (process.env.NODE_ENV !== "production") {
  globalThis.__verellaDbPoolV3 = pool;
}

export const db = drizzle(pool, { schema, mode: "default" });
export type Database = typeof db;
