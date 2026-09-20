import {
  bigint,
  boolean,
  index,
  json,
  mysqlTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { fk, id, softDelete, timestamps, uuid } from "./_helpers";

export type UserStatus = "active" | "suspended" | "pending";

/** Single table for customers AND staff — capabilities come from roles, not a type flag. */
export const users = mysqlTable("users", {
  id: id(),
  uuid: uuid(),
  email: varchar("email", { length: 191 }).notNull().unique(),
  phone: varchar("phone", { length: 32 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  fullName: varchar("full_name", { length: 191 }).notNull(),
  avatarMediaId: fk("avatar_media_id"),
  status: varchar("status", { length: 32 }).notNull().default("active").$type<UserStatus>(),
  emailVerifiedAt: timestamp("email_verified_at"),
  phoneVerifiedAt: timestamp("phone_verified_at"),
  lastLoginAt: timestamp("last_login_at"),
  ...timestamps,
  ...softDelete,
});

export const roles = mysqlTable("roles", {
  id: id(),
  uuid: uuid(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  isSystem: boolean("is_system").notNull().default(false),
  description: varchar("description", { length: 255 }),
  ...timestamps,
});

/** Slugs are dot-namespaced, e.g. "orders.view", "menu.manage". */
export const permissions = mysqlTable("permissions", {
  id: id(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  group: varchar("group", { length: 100 }).notNull(),
});

export const rolePermissions = mysqlTable(
  "role_permissions",
  {
    roleId: fk("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: fk("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

/**
 * Per-user permission overrides, additive on top of role permissions.
 * Powers the "granular staff access" admin UI: a staff member's effective
 * permission set = union(role permissions, rows here).
 */
export const userPermissions = mysqlTable(
  "user_permissions",
  {
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permissionId: fk("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.permissionId] })],
);

/** branchId nullable = role applies to all branches; kept out of the PK since MySQL forces PK columns NOT NULL. */
export const userRoles = mysqlTable(
  "user_roles",
  {
    id: id(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: fk("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    branchId: fk("branch_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("user_roles_unique").on(t.userId, t.roleId, t.branchId),
    index("user_roles_user_idx").on(t.userId),
  ],
);

/** Auth.js v5 database session strategy. */
export const sessions = mysqlTable("sessions", {
  id: id(),
  userId: fk("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Email/phone verification tokens. */
export const verificationTokens = mysqlTable(
  "verification_tokens",
  {
    id: id(),
    identifier: varchar("identifier", { length: 191 }).notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [index("verification_tokens_identifier_idx").on(t.identifier)],
);

export const passwordResets = mysqlTable("password_resets", {
  id: id(),
  userId: fk("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activityLogs = mysqlTable(
  "activity_logs",
  {
    id: id(),
    actorUserId: fk("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: fk("entity_id"),
    changes: json("changes"),
    ip: varchar("ip", { length: 64 }),
    userAgent: varchar("user_agent", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("activity_logs_entity_idx").on(t.entityType, t.entityId),
    index("activity_logs_actor_idx").on(t.actorUserId),
  ],
);
