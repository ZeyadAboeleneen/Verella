import "./env";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
import { importCatalog } from "./catalog/import";

/**
 * Syncs an existing database with src/catalog (e.g. to replace the old demo
 * catalog). Overwrites names, descriptions, prices and photos of catalog
 * products — run it once; after that the dashboard is the source of truth.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const connection = await mysql.createConnection(url);
  await importCatalog(drizzle(connection, { schema, mode: "default" }));
  await connection.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
