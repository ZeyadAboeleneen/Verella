"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import { db, users, roles, userRoles, userPermissions, permissions } from "@verella/db";
import { createStaffSchema, PERMISSION_SLUGS, type PermissionSlug } from "@verella/core";
import { guardPermission, type ActionResult } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/activity/log";

/** True when the target user holds super_admin — those accounts are managed nowhere but the seed. */
async function isSuperAdmin(userId: number): Promise<boolean> {
  const rows = await db
    .select({ slug: roles.slug })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));
  return rows.some((r) => r.slug === "super_admin");
}

export async function createStaffUserAction(input: {
  fullName: string;
  email: string;
  password: string;
  roleSlug: string;
}): Promise<ActionResult<{ id: number }>> {
  const guard = await guardPermission("users.manage");
  if ("error" in guard) return guard;

  if (input.roleSlug === "customer" || input.roleSlug === "super_admin") return { error: "Invalid role." };

  const parsed = createStaffSchema.safeParse({ fullName: input.fullName, email: input.email, password: input.password });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (existing) return { error: "An account with this email already exists." };

  const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.slug, input.roleSlug)).limit(1);
  if (!role) return { error: "Role not found." };

  const passwordHash = await bcrypt.hash(input.password, 12);
  const id = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email: input.email, fullName: input.fullName, passwordHash, status: "active", emailVerifiedAt: new Date() })
      .$returningId();
    await tx.insert(userRoles).values({ userId: user.id, roleId: role.id });
    return user.id;
  });

  await logActivity({ actorUserId: Number(guard.id), action: "user.created", entityType: "user", entityId: id, changes: { roleSlug: input.roleSlug } });

  revalidatePath("/admin/users");
  return { success: true, data: { id } };
}

export async function updateUserRoleAction(userId: number, roleSlug: string): Promise<ActionResult> {
  const guard = await guardPermission("users.manage");
  if ("error" in guard) return guard;

  if (roleSlug === "super_admin") return { error: "Invalid role." };
  if (await isSuperAdmin(userId)) return { error: "The primary admin account cannot be changed." };

  const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.slug, roleSlug)).limit(1);
  if (!role) return { error: "Role not found." };

  await db.transaction(async (tx) => {
    await tx.delete(userRoles).where(eq(userRoles.userId, userId));
    await tx.insert(userRoles).values({ userId, roleId: role.id });
    // Demoting to customer removes any granular dashboard grants too.
    if (roleSlug === "customer") {
      await tx.delete(userPermissions).where(eq(userPermissions.userId, userId));
    }
  });

  await logActivity({ actorUserId: Number(guard.id), action: "user.role_changed", entityType: "user", entityId: userId, changes: { roleSlug } });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function toggleUserStatusAction(userId: number, status: "active" | "suspended"): Promise<ActionResult> {
  const guard = await guardPermission("users.manage");
  if ("error" in guard) return guard;

  if (await isSuperAdmin(userId)) return { error: "The primary admin account cannot be suspended." };

  await db.update(users).set({ status }).where(eq(users.id, userId));
  await logActivity({ actorUserId: Number(guard.id), action: "user.status_changed", entityType: "user", entityId: userId, changes: { status } });
  revalidatePath("/admin/users");
  return { success: true };
}

/** Admin-initiated password reset — sets a new password directly (e.g. read out to the staff member). */
export async function resetUserPasswordAction(userId: number, newPassword: string): Promise<ActionResult> {
  const guard = await guardPermission("users.manage");
  if ("error" in guard) return guard;

  if (newPassword.length < 8) return { error: "Password must be at least 8 characters." };
  if (await isSuperAdmin(userId)) return { error: "Reset the primary admin password from My Account instead." };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  await logActivity({ actorUserId: Number(guard.id), action: "user.password_reset", entityType: "user", entityId: userId });
  revalidatePath("/admin/users");
  return { success: true };
}

/**
 * Replaces a user's granular permission overrides. Effective access is the
 * union of role permissions and these; changes apply on the user's next
 * sign-in (sessions are JWTs).
 */
export async function setUserPermissionsAction(userId: number, slugs: PermissionSlug[]): Promise<ActionResult> {
  const guard = await guardPermission("users.manage");
  if ("error" in guard) return guard;

  const valid = slugs.filter((s): s is PermissionSlug => (PERMISSION_SLUGS as readonly string[]).includes(s));
  if (await isSuperAdmin(userId)) return { error: "The primary admin already has every permission." };

  await db.transaction(async (tx) => {
    await tx.delete(userPermissions).where(eq(userPermissions.userId, userId));
    if (valid.length > 0) {
      const permRows = await tx.select({ id: permissions.id }).from(permissions).where(inArray(permissions.slug, valid));
      if (permRows.length > 0) {
        await tx.insert(userPermissions).values(permRows.map((p) => ({ userId, permissionId: p.id })));
      }
    }
  });

  await logActivity({ actorUserId: Number(guard.id), action: "user.permissions_changed", entityType: "user", entityId: userId, changes: { permissions: valid } });
  revalidatePath("/admin/users");
  return { success: true };
}
