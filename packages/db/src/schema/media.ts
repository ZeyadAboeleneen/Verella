import { bigint, boolean, int, mysqlTable, varchar } from "drizzle-orm/mysql-core";
import { fk, id, softDelete, timestamps, uuid } from "./_helpers";
import { users } from "./auth";

/** Registry row for every uploaded file; bytes live in MinIO (or any S3-compatible bucket). */
export const media = mysqlTable("media", {
  id: id(),
  uuid: uuid(),
  disk: varchar("disk", { length: 32 }).notNull().default("minio"),
  bucket: varchar("bucket", { length: 100 }).notNull(),
  objectKey: varchar("object_key", { length: 512 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  mime: varchar("mime", { length: 100 }).notNull(),
  width: int("width"),
  height: int("height"),
  sizeBytes: bigint("size_bytes", { mode: "number", unsigned: true }),
  alt: varchar("alt", { length: 255 }),
  title: varchar("title", { length: 255 }),
  folder: varchar("folder", { length: 100 }),
  uploadedBy: fk("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  isPrivate: boolean("is_private").notNull().default(false),
  ...timestamps,
  ...softDelete,
});
