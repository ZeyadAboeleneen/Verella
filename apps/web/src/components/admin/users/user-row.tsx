"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserRoleAction, toggleUserStatusAction } from "@/lib/users/actions";
import { Tr, Td } from "@/components/admin/table";

export function UserRow({
  userId,
  fullName,
  email,
  phone,
  status,
  roleSlug,
  roleOptions,
}: {
  userId: number;
  fullName: string;
  email: string;
  phone?: string | null;
  status: string;
  roleSlug: string;
  /** Assignable roles (any role except super_admin/customer) — omitted for the customer table, which never shows this select. */
  roleOptions?: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isSuperAdmin = roleSlug === "super_admin";
  const isCustomerRow = roleSlug === "customer";

  return (
    <Tr>
      <Td className="font-medium">{fullName}</Td>
      <Td className="text-on-surface-variant">{email}</Td>
      {isCustomerRow ? (
        <Td className="text-on-surface-variant">{phone ?? "—"}</Td>
      ) : (
        <Td>
          {isSuperAdmin ? (
            <span className="text-xs font-semibold uppercase text-on-surface-variant">Super Admin</span>
          ) : (
            <select
              defaultValue={roleSlug}
              disabled={pending}
              onChange={(e) =>
                startTransition(async () => {
                  const res = await updateUserRoleAction(userId, e.target.value);
                  if ("error" in res) setError(res.error);
                  else router.refresh();
                })
              }
              className="h-9 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 text-xs text-on-surface"
            >
              {(roleOptions ?? []).map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
        </Td>
      )}
      <Td>
        <span
          className={
            status === "active"
              ? "rounded-full bg-secondary-container px-2 py-0.5 text-xs text-on-secondary-container"
              : "rounded-full bg-error-container px-2 py-0.5 text-xs text-on-error-container"
          }
        >
          {status}
        </span>
      </Td>
      <Td className="text-end">
        {!isSuperAdmin && (
          <div className="flex items-center justify-end gap-3">
            <Link href={`/admin/users/${userId}`} className="text-xs font-semibold text-primary hover:underline">
              Manage
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await toggleUserStatusAction(userId, status === "active" ? "suspended" : "active");
                  if ("error" in res) setError(res.error);
                  else router.refresh();
                })
              }
              className="text-xs font-semibold text-primary hover:underline"
            >
              {status === "active" ? "Suspend" : "Reactivate"}
            </button>
          </div>
        )}
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
      </Td>
    </Tr>
  );
}
