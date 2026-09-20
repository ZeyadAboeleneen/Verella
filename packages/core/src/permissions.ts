/**
 * Canonical RBAC definition — the single source of truth for permission slugs
 * and default roles. Consumed by packages/db/src/seed.ts (to populate the
 * roles/permissions tables) and by apps/web (to gate dashboard sections and
 * render the Roles & Permissions screen) so the two never drift apart.
 */

export const PERMISSION_SLUGS = [
  "dashboard.view",
  "menu.view",
  "menu.manage",
  "store.view",
  "store.manage",
  "discounts.view",
  "discounts.manage",
  "orders.view",
  "orders.manage",
  "payments.view",
  "payments.review",
  "customers.view",
  "customers.manage",
  "media.view",
  "media.manage",
  "content.view",
  "content.manage",
  "users.view",
  "users.manage",
  "roles.manage",
  "branches.view",
  "branches.manage",
  "settings.manage",
  "activity.view",
] as const;

export type PermissionSlug = (typeof PERMISSION_SLUGS)[number];

export function permissionGroup(slug: PermissionSlug): string {
  return slug.split(".")[0];
}

export interface RoleDefinition {
  slug: "super_admin" | "admin" | "manager" | "staff" | "customer";
  name: string;
  isSystem: true;
  permissions: PermissionSlug[];
}

const ALL_PERMISSIONS = [...PERMISSION_SLUGS];

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  { slug: "super_admin", name: "Super Admin", isSystem: true, permissions: ALL_PERMISSIONS },
  {
    slug: "admin",
    name: "Admin",
    isSystem: true,
    permissions: ALL_PERMISSIONS.filter((p) => p !== "roles.manage"),
  },
  {
    slug: "manager",
    name: "Manager",
    isSystem: true,
    permissions: [
      "dashboard.view",
      "menu.view",
      "menu.manage",
      "store.view",
      "store.manage",
      "discounts.view",
      "discounts.manage",
      "orders.view",
      "orders.manage",
      "payments.view",
      "payments.review",
      "customers.view",
      "media.view",
      "media.manage",
      "content.view",
      "content.manage",
      "branches.view",
      "activity.view",
    ],
  },
  {
    slug: "staff",
    name: "Staff",
    isSystem: true,
    permissions: ["dashboard.view", "orders.view", "orders.manage", "payments.view", "payments.review", "customers.view"],
  },
  { slug: "customer", name: "Customer", isSystem: true, permissions: [] },
];

/** Permissions implied by "dashboard access at all" — used by proxy.ts for a cheap first-pass gate. */
export const DASHBOARD_ACCESS_ROLES: RoleDefinition["slug"][] = ["super_admin", "admin", "manager", "staff"];
