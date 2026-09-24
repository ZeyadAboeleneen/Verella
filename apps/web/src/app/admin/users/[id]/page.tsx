import Link from "@/components/LocaleLink";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, users, userRoles, roles, rolePermissions, permissions, userPermissions } from "@verella/db";
import { PERMISSION_SLUGS, type PermissionSlug } from "@verella/core";
import { ManageUserPanel } from "@/components/admin/users/manage-user-panel";

export default async function AdminManageUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) notFound();

  const [user] = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email, phone: users.phone, status: users.status, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) notFound();

  const roleRows = await db
    .select({ slug: roles.slug })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));
  const roleSlug = roleRows[0]?.slug ?? "customer";

  // Permissions the current role already grants (shown as locked-on) and the
  // user's personal overrides (editable).
  const rolePermRows = roleRows.length
    ? await db
        .select({ slug: permissions.slug })
        .from(userRoles)
        .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(userRoles.userId, userId))
    : [];
  const overrideRows = await db
    .select({ slug: permissions.slug })
    .from(userPermissions)
    .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(eq(userPermissions.userId, userId));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/users" className="text-sm text-primary hover:underline">
        ← Users & Roles
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-on-surface">{user.fullName}</h1>
      <p className="mt-1 text-sm text-on-surface-variant">
        {user.email}
        {user.phone ? ` · ${user.phone}` : ""} · joined {user.createdAt.toISOString().slice(0, 10)}
      </p>

      <ManageUserPanel
        userId={user.id}
        status={user.status}
        roleSlug={roleSlug}
        allPermissions={[...PERMISSION_SLUGS] as PermissionSlug[]}
        rolePermissions={rolePermRows.map((r) => r.slug as PermissionSlug)}
        overridePermissions={overrideRows.map((r) => r.slug as PermissionSlug)}
      />
    </div>
  );
}
