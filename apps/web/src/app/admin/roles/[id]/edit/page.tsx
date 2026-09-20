import { notFound } from "next/navigation";
import { PERMISSION_SLUGS } from "@verella/core";
import { RoleForm } from "@/components/admin/roles/role-form";
import { getAllRoles } from "@/lib/roles/queries";

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const roleId = Number(id);
  if (!Number.isInteger(roleId)) notFound();

  const roleList = await getAllRoles();
  const role = roleList.find((r) => r.id === roleId);
  if (!role) notFound();
  if (role.isSystem) notFound();

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-on-surface">Edit role</h1>
      <RoleForm
        roleId={role.id}
        allPermissions={[...PERMISSION_SLUGS]}
        defaultValues={{ name: role.name, slug: role.slug, description: role.description, permissionSlugs: role.permissionSlugs }}
      />
    </div>
  );
}
