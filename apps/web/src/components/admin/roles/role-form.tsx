"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PermissionSlug } from "@verella/core";
import { createRoleAction, updateRoleAction } from "@/lib/roles/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, FormError } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

/** Human labels for the dashboard sections each permission group unlocks — kept in sync with ManageUserPanel's copy. */
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

export function RoleForm({
  roleId,
  allPermissions,
  defaultValues,
}: {
  roleId?: number;
  allPermissions: PermissionSlug[];
  defaultValues?: { name: string; slug: string; description: string | null; permissionSlugs: string[] };
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [slug, setSlug] = useState(defaultValues?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!roleId);
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [selected, setSelected] = useState<Set<PermissionSlug>>(new Set((defaultValues?.permissionSlugs ?? []) as PermissionSlug[]));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const byGroup = new Map<string, PermissionSlug[]>();
    for (const p of allPermissions) {
      const group = p.split(".")[0];
      byGroup.set(group, [...(byGroup.get(group) ?? []), p]);
    }
    return [...byGroup.entries()];
  }, [allPermissions]);

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(
        value
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "") || "",
      );
    }
  }

  async function onSubmit() {
    setPending(true);
    setError(null);
    const permissionSlugs = [...selected];
    const result = roleId
      ? await updateRoleAction(roleId, { name, description, permissionSlugs })
      : await createRoleAction({ name, slug, description, permissionSlugs });
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      toast(result.error, "error");
      return;
    }
    toast(roleId ? "Role updated." : "Role created.");
    router.push("/admin/roles");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="space-y-5">
        <FormError>{error}</FormError>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Role name</Label>
            <Input id="name" placeholder="Marketing Editor" value={name} onChange={(e) => onNameChange(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              placeholder="marketing_editor"
              value={slug}
              disabled={!!roleId}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
            />
            {roleId && <p className="mt-1 text-xs text-on-surface-variant">Slug can&apos;t be changed after creation.</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description (optional)</Label>
          <Input id="description" placeholder="What this role is for" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <Label>Permissions</Label>
          <p className="mb-2 mt-1 text-xs text-on-surface-variant">
            Tick every dashboard section a member with this role should be able to access.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {grouped.map(([group, slugs]) => (
              <div key={group} className="rounded-xl border border-outline-variant/60 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {GROUP_LABELS[group] ?? group}
                </p>
                <div className="space-y-1.5">
                  {slugs.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.has(s)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(s);
                          else next.delete(s);
                          setSelected(next);
                        }}
                        className="h-4 w-4 rounded border-outline-variant"
                      />
                      <span className="text-on-surface">{s.split(".")[1]}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="button" onClick={onSubmit} loading={pending} disabled={!name.trim() || !slug.trim()}>
            {roleId ? "Save changes" : "Create role"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/roles")}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
