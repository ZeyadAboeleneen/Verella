import { cache } from "react";
import { auth } from "@/auth";
import type { PermissionSlug } from "@verella/core";

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  roles: string[];
  permissions: string[];
};

// De-dupes repeated auth() calls within a single request — e.g. the admin
// layout resolves the session once, and several admin pages (like
// admin/account) independently call getSessionUser() again on top of that.
// Without this, each of those re-runs NextAuth's jwt callback, which
// periodically (every ACCESS_REFRESH_MS) re-queries the DB for roles and
// permissions — turning one page load into multiple redundant DB round trips.
const cachedAuth = cache(auth);

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await cachedAuth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export class AuthError extends Error {}
export class ForbiddenError extends Error {}

/** Throws — callers (server actions) must catch and translate to a { error } result. See docs/SETUP.md note on Proxy not being a complete auth boundary. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("You must be signed in.");
  return user;
}

export async function requirePermission(permission: PermissionSlug): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.permissions.includes(permission)) {
    throw new ForbiddenError("You do not have permission to perform this action.");
  }
  return user;
}

export function hasPermission(user: SessionUser | null, permission: PermissionSlug): boolean {
  return user?.permissions.includes(permission) ?? false;
}

/**
 * Standard shape for server-action results so forms can render a single error
 * string. When T is provided, `data` is required on success — callers don't
 * need to null-check it after narrowing on `"error" in result`.
 */
export type ActionResult<T = undefined> = (T extends undefined ? { success: true } : { success: true; data: T }) | { error: string };

export async function guardPermission(permission: PermissionSlug): Promise<SessionUser | { error: string }> {
  try {
    return await requirePermission(permission);
  } catch (err) {
    if (err instanceof AuthError) return { error: "You must be signed in." };
    if (err instanceof ForbiddenError) return { error: "You do not have permission to perform this action." };
    throw err;
  }
}
