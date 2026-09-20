import { PERMISSION_SLUGS } from "@verella/core";
import { RoleForm } from "@/components/admin/roles/role-form";

export default function NewRolePage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-on-surface">New role</h1>
      <RoleForm allPermissions={[...PERMISSION_SLUGS]} />
    </div>
  );
}
