import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, Thead, Th, Tr, Td, EmptyRow } from "@/components/admin/table";
import { DeleteButton } from "@/components/admin/delete-button";
import { getAllRoles } from "@/lib/roles/queries";
import { deleteRoleAction } from "@/lib/roles/actions";

export default async function AdminRolesPage() {
  const rolesList = await getAllRoles();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-on-surface">Roles</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Built-in roles (Admin, Manager, Staff, Customer) cover most needs — create a custom role here when you need a
            different mix of dashboard sections.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/roles/new">
            <Plus size={16} /> New role
          </Link>
        </Button>
      </div>

      <div className="mt-6">
        <Table>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Slug</Th>
              <Th>Permissions</Th>
              <Th>Members</Th>
              <Th>Type</Th>
              <Th className="text-end">Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {rolesList.map((r) => (
              <Tr key={r.id}>
                <Td className="font-medium">{r.name}</Td>
                <Td className="text-on-surface-variant">{r.slug}</Td>
                <Td className="text-on-surface-variant">{r.permissionSlugs.length}</Td>
                <Td className="text-on-surface-variant">{r.userCount}</Td>
                <Td>
                  <span
                    className={
                      r.isSystem
                        ? "rounded-full bg-surface-container-high px-2 py-0.5 text-xs text-on-surface-variant"
                        : "rounded-full bg-secondary-container px-2 py-0.5 text-xs text-on-secondary-container"
                    }
                  >
                    {r.isSystem ? "Built-in" : "Custom"}
                  </span>
                </Td>
                <Td className="text-end">
                  {!r.isSystem && (
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/roles/${r.id}/edit`} className="text-on-surface-variant hover:text-primary">
                        <Pencil size={16} />
                      </Link>
                      <DeleteButton
                        action={deleteRoleAction.bind(null, r.id)}
                        confirmText={`Delete role "${r.name}"? This cannot be undone.`}
                        successMessage="Role deleted."
                      />
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
            {rolesList.length === 0 && <EmptyRow colSpan={6}>No roles yet.</EmptyRow>}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
