import Link from "next/link";
import { desc, eq, ne, notInArray, sql, count } from "drizzle-orm";
import { db, users, userRoles, roles } from "@verella/db";
import { Table, Thead, Th, EmptyRow } from "@/components/admin/table";
import { Button } from "@/components/ui/button";
import { UserRow } from "@/components/admin/users/user-row";
import { NewStaffForm } from "@/components/admin/users/new-staff-form";
import { getAllRoles } from "@/lib/roles/queries";
import { Pagination, PAGE_SIZE } from "@/components/admin/pagination";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [staffRows, allRoles, [{ total }]] = await Promise.all([
    db
      .select({ userId: users.id, fullName: users.fullName, email: users.email, status: users.status, roleSlug: roles.slug })
      .from(userRoles)
      .innerJoin(users, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      // Any role other than "customer" grants dashboard access, whether it's
      // one of the 4 built-in staff roles or a custom one created in Admin →
      // Roles — a fixed whitelist would silently hide custom-role members here.
      .where(ne(roles.slug, "customer")),
    getAllRoles(),
    // Independent of staffRows/customerRows below — no reason to wait on
    // those to run this count, so it joins the first parallel batch instead
    // of adding a third sequential round trip.
    db.select({ total: sql<number>`COUNT(*)` }).from(users),
  ]);

  const roleOptions = allRoles.filter((r) => r.slug !== "super_admin" && r.slug !== "customer").map((r) => ({ slug: r.slug, name: r.name }));

  // Everyone who is not staff is a customer — including any user with no
  // role row at all, so nobody can be invisible to this screen.
  const staffIds = staffRows.map((r) => r.userId);
  const customerWhere = staffIds.length > 0 ? notInArray(users.id, staffIds) : undefined;
  const [customerRows, [{ total: customerTotal }]] = await Promise.all([
    db
      .select({
        userId: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(customerWhere)
      .orderBy(desc(users.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ total: count() }).from(users).where(customerWhere),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-on-surface">Users & Roles</h1>
        <div className="flex items-center gap-4">
          <p className="text-sm text-on-surface-variant">{total} registered users</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/roles">Manage roles</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <h2 className="mb-3 font-display text-lg font-bold text-on-surface">Staff & administrators</h2>
            <Table>
              <Thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th className="text-end">Actions</Th>
                </tr>
              </Thead>
              <tbody>
                {staffRows.map((u) => (
                  <UserRow
                    key={u.userId}
                    userId={u.userId}
                    fullName={u.fullName}
                    email={u.email}
                    status={u.status}
                    roleSlug={u.roleSlug}
                    roleOptions={roleOptions}
                  />
                ))}
                {staffRows.length === 0 && <EmptyRow colSpan={5}>No staff users yet.</EmptyRow>}
              </tbody>
            </Table>
          </section>

          <section>
            <h2 className="mb-1 font-display text-lg font-bold text-on-surface">Customers</h2>
            <p className="mb-3 text-sm text-on-surface-variant">
              {customerTotal} customer accounts. Promote one to give it dashboard access.
            </p>
            <Table>
              <Thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>Status</Th>
                  <Th className="text-end">Actions</Th>
                </tr>
              </Thead>
              <tbody>
                {customerRows.map((u) => (
                  <UserRow
                    key={u.userId}
                    userId={u.userId}
                    fullName={u.fullName}
                    email={u.email}
                    phone={u.phone}
                    status={u.status}
                    roleSlug="customer"
                  />
                ))}
                {customerRows.length === 0 && <EmptyRow colSpan={5}>No customer accounts yet.</EmptyRow>}
              </tbody>
            </Table>
            <Pagination basePath="/admin/users" page={page} total={customerTotal} />
          </section>
        </div>

        <NewStaffForm roleOptions={roleOptions} />
      </div>
    </div>
  );
}
