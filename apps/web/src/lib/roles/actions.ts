"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db, roles, rolePermissions, permissions, userRoles } from "@verella/db";
import { PERMISSION_SLUGS, type PermissionSlug } from "@verella/core";
import { guardPermission, type ActionResult } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/activity/log";

const SLUG_PATTERN = /^[a-z][a-z0-9_]*$/;

function revalidateRoles() {
  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
}

export interface RoleInput {
  name: string;
  slug: string;
  description?: string;
  permissionSlugs: PermissionSlug[];
}

function validPermissionSlugs(slugs: string[]): PermissionSlug[] {
  return slugs.filter((s): s is PermissionSlug => (PERMISSION_SLUGS as readonly string[]).includes(s));
}

export async function createRoleAction(input: RoleInput): Promise<ActionResult<{ id: number }>> {
  const guard = await guardPermission("roles.manage");
  if ("error" in guard) return guard;

  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  if (!name) return { error: "Name is required." };
  if (!SLUG_PATTERN.test(slug)) return { error: "Slug must start with a letter and contain only lowercase letters, numbers, and underscores." };

  const [existing] = await db.select({ id: roles.id }).from(roles).where(eq(roles.slug, slug)).limit(1);
  if (existing) return { error: "A role with this slug already exists." };

  const permSlugs = validPermissionSlugs(input.permissionSlugs);

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(roles)
      .values({ name, slug, description: input.description?.trim() || null, isSystem: false })
      .$returningId();
    if (permSlugs.length > 0) {
      const permRows = await tx.select({ id: permissions.id }).from(permissions).where(inArray(permissions.slug, permSlugs));
      if (permRows.length > 0) {
        await tx.insert(rolePermissions).values(permRows.map((p) => ({ roleId: row.id, permissionId: p.id })));
      }
    }
    return row.id;
  });

  await logActivity({ actorUserId: Number(guard.id), action: "role.created", entityType: "role", entityId: id, changes: { name, slug } });
  revalidateRoles();
  return { success: true, data: { id } };
}

export async function updateRoleAction(id: number, input: Omit<RoleInput, "slug">): Promise<ActionResult> {
  const guard = await guardPermission("roles.manage");
  if ("error" in guard) return guard;

  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role) return { error: "Role not found." };
  if (role.isSystem) return { error: "Built-in roles can't be edited — create a new role instead." };

  const name = input.name.trim();
  if (!name) return { error: "Name is required." };

  const permSlugs = validPermissionSlugs(input.permissionSlugs);

  await db.transaction(async (tx) => {
    await tx.update(roles).set({ name, description: input.description?.trim() || null }).where(eq(roles.id, id));
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    if (permSlugs.length > 0) {
      const permRows = await tx.select({ id: permissions.id }).from(permissions).where(inArray(permissions.slug, permSlugs));
      if (permRows.length > 0) {
        await tx.insert(rolePermissions).values(permRows.map((p) => ({ roleId: id, permissionId: p.id })));
      }
    }
  });

  await logActivity({ actorUserId: Number(guard.id), action: "role.updated", entityType: "role", entityId: id });
  revalidateRoles();
  return { success: true };
}

export async function deleteRoleAction(id: number): Promise<ActionResult> {
  const guard = await guardPermission("roles.manage");
  if ("error" in guard) return guard;

  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role) return { error: "Role not found." };
  if (role.isSystem) return { error: "Built-in roles can't be deleted." };

  const [assigned] = await db.select({ userId: userRoles.userId }).from(userRoles).where(eq(userRoles.roleId, id)).limit(1);
  if (assigned) return { error: "Reassign the members using this role before deleting it." };

  await db.delete(roles).where(eq(roles.id, id));
  await logActivity({ actorUserId: Number(guard.id), action: "role.deleted", entityType: "role", entityId: id });
  revalidateRoles();
  return { success: true };
}
