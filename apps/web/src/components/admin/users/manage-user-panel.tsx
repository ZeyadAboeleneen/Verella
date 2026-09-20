"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PermissionSlug } from "@verella/core";
import {
  updateUserRoleAction,
  toggleUserStatusAction,
  resetUserPasswordAction,
  setUserPermissionsAction,
} from "@/lib/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, FormError } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

const ROLE_OPTIONS = ["admin", "manager", "staff", "customer"] as const;

/** Human labels for the dashboard sections each permission group unlocks. */
const GROUP_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  menu: "Menu",
  store: "Products (Store)",
  discounts: "Discounts",
  orders: "Orders",
  payments: "Payments",
  customers: "Customers",
  media: "Media Library",
  content: "Homepage",
  users: "Users",
  roles: "Roles",
  branches: "Branches",
  settings: "Settings",
  activity: "Activity Logs",
};

export function ManageUserPanel({
  userId,
  status,
  roleSlug,
  allPermissions,
  rolePermissions,
  overridePermissions,
}: {
  userId: number;
  status: string;
  roleSlug: string;
  allPermissions: PermissionSlug[];
  rolePermissions: PermissionSlug[];
  overridePermissions: PermissionSlug[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Set<PermissionSlug>>(new Set(overridePermissions));
  const isSuperAdmin = roleSlug === "super_admin";
  const isStaff = roleSlug !== "customer" && !isSuperAdmin;

  const grouped = useMemo(() => {
    const byGroup = new Map<string, PermissionSlug[]>();
    for (const slug of allPermissions) {
      const group = slug.split(".")[0];
      byGroup.set(group, [...(byGroup.get(group) ?? []), slug]);
    }
    return [...byGroup.entries()];
  }, [allPermissions]);

  function run(fn: () => Promise<{ error: string } | { success: true }>, successMsg: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await fn();
      if ("error" in res) {
        setError(res.error);
        toast(res.error, "error");
      } else {
        setNotice(successMsg);
        toast(successMsg);
        router.refresh();
      }
    });
  }

  if (isSuperAdmin) {
    return (
      <p className="mt-6 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5 text-sm text-on-surface-variant">
        This is the primary administrator account. It always has full access and cannot be modified here.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <FormError>{error}</FormError>
      {notice && <p className="text-sm text-secondary">{notice}</p>}

      {/* ── Role & status ── */}
      <Card>
        <CardHeader>
          <CardTitle>Role & status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div>
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              defaultValue={roleSlug}
              disabled={pending}
              onChange={(e) =>
                run(() => updateUserRoleAction(userId, e.target.value as (typeof ROLE_OPTIONS)[number]), "Role updated — applies at their next sign-in.")
              }
              className="flex h-11 w-48 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm capitalize text-on-surface"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r} className="capitalize">
                  {r}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="outline"
            loading={pending}
            onClick={() =>
              run(() => toggleUserStatusAction(userId, status === "active" ? "suspended" : "active"), status === "active" ? "Account suspended." : "Account reactivated.")
            }
          >
            {status === "active" ? "Suspend account" : "Reactivate account"}
          </Button>
        </CardContent>
      </Card>

      {/* ── Granular permissions (staff only) ── */}
      {isStaff && (
        <Card>
          <CardHeader>
            <CardTitle>Dashboard access</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-on-surface-variant">
              Greyed-out checks come with the <span className="capitalize">{roleSlug}</span> role. Tick extra sections to
              grant them to this member only. Changes apply the next time they sign in.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {grouped.map(([group, slugs]) => (
                <div key={group} className="rounded-xl border border-outline-variant/60 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    {GROUP_LABELS[group] ?? group}
                  </p>
                  <div className="space-y-1.5">
                    {slugs.map((slug) => {
                      const fromRole = rolePermissions.includes(slug);
                      const checked = fromRole || overrides.has(slug);
                      return (
                        <label key={slug} className={`flex items-center gap-2 text-sm ${fromRole ? "opacity-60" : ""}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={fromRole || pending}
                            onChange={(e) => {
                              const next = new Set(overrides);
                              if (e.target.checked) next.add(slug);
                              else next.delete(slug);
                              setOverrides(next);
                            }}
                            className="h-4 w-4 rounded border-outline-variant"
                          />
                          <span className="text-on-surface">{slug.split(".")[1]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              loading={pending}
              className="mt-4"
              onClick={() => run(() => setUserPermissionsAction(userId, [...overrides]), "Permissions saved — apply at their next sign-in.")}
            >
              Save permissions
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Password reset ── */}
      <Card>
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={(formData) => {
              const pw = String(formData.get("newPassword") ?? "");
              run(() => resetUserPasswordAction(userId, pw), "Password reset. Share the new password securely.");
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="min-w-56 flex-1">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" name="newPassword" type="password" minLength={8} required />
            </div>
            <Button type="submit" variant="outline" loading={pending}>
              Reset password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
