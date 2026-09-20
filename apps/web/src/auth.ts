import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users, userRoles, roles, rolePermissions, permissions, userPermissions } from "@verella/db";
import { loginSchema } from "@verella/core";
import { withDbTimeout } from "@/lib/db-timeout";

/**
 * Resolves a user's current roles + effective permissions straight from the
 * database. Effective permissions = union(role permissions, per-user
 * overrides). Returns null for a missing or non-active account so callers can
 * revoke access (e.g. a suspended user loses dashboard access on next sync).
 */
async function loadUserAccess(userId: number): Promise<{ roles: string[]; permissions: string[] } | null> {
  const [user] = await db.select({ status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.status !== "active") return null;

  const [roleRows, permRows, overrideRows] = await Promise.all([
    db.select({ slug: roles.slug }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(userRoles.userId, userId)),
    db
      .select({ slug: permissions.slug })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, userId)),
    db
      .select({ slug: permissions.slug })
      .from(userPermissions)
      .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
      .where(eq(userPermissions.userId, userId)),
  ]);

  return {
    roles: roleRows.map((r) => r.slug),
    permissions: [...new Set([...permRows.map((p) => p.slug), ...overrideRows.map((p) => p.slug)])],
  };
}

// How long a signed-in session may keep stale roles/permissions before the
// jwt callback re-syncs them from the DB. This is what makes an admin's
// role/permission edits (and account suspensions) take effect without forcing
// the affected user to log out and back in — while avoiding a DB round-trip on
// every single request.
const ACCESS_REFRESH_MS = 30_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user || !user.passwordHash || user.status !== "active") return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        const access = await loadUserAccess(user.id);
        return {
          id: String(user.id),
          email: user.email,
          name: user.fullName,
          roles: access?.roles ?? [],
          permissions: access?.permissions ?? [],
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.roles = (user as { roles?: string[] }).roles ?? [];
        token.permissions = (user as { permissions?: string[] }).permissions ?? [];
        token.accessSyncedAt = Date.now();
        return token;
      }

      // Periodically re-sync from the DB so role/permission edits and account
      // suspensions propagate to already-signed-in users. A DB blip leaves the
      // existing (stale) values in place rather than logging anyone out.
      const t = token as { uid?: string; accessSyncedAt?: number };
      const last = t.accessSyncedAt ?? 0;
      if (t.uid && Date.now() - last > ACCESS_REFRESH_MS) {
        try {
          const access = await withDbTimeout(loadUserAccess(Number(t.uid)), 8000);
          token.roles = access?.roles ?? [];
          token.permissions = access?.permissions ?? [];
          token.accessSyncedAt = Date.now();
        } catch {
          // Keep existing token values; try again on the next request.
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Cast sidesteps a next-auth v5 beta typing quirk where the session
      // callback's `token` param infers oddly under the database/jwt union.
      const t = token as { uid?: string; roles?: string[]; permissions?: string[] };
      if (session.user) {
        session.user.id = t.uid ?? "";
        session.user.roles = t.roles ?? [];
        session.user.permissions = t.permissions ?? [];
      }
      return session;
    },
  },
});
