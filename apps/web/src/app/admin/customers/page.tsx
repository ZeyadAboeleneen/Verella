import Link from "@/components/LocaleLink";
import { desc, eq, count, sum } from "drizzle-orm";
import { db, customers, users, orders } from "@verella/db";
import { formatMoney, toCents } from "@verella/core";
import { Table, Thead, Th, Tr, Td, EmptyRow } from "@/components/admin/table";
import { Pagination, PAGE_SIZE } from "@/components/admin/pagination";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: customers.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        loyaltyPoints: customers.loyaltyPoints,
        createdAt: customers.createdAt,
        orderCount: count(orders.id),
        totalSpent: sum(orders.grandTotal),
      })
      .from(customers)
      .innerJoin(users, eq(users.id, customers.userId))
      .leftJoin(orders, eq(orders.customerId, customers.id))
      .groupBy(customers.id, users.fullName, users.email, users.phone, customers.loyaltyPoints, customers.createdAt)
      .orderBy(desc(customers.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ total: count() }).from(customers),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-on-surface">Customers</h1>

      <div className="mt-6">
        <Table>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Phone</Th>
              <Th>Orders</Th>
              <Th>Total spent</Th>
              <Th>Joined</Th>
              <Th className="text-end">Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {rows.map((c) => (
              <Tr key={c.id}>
                <Td className="font-medium">{c.fullName}</Td>
                <Td className="text-on-surface-variant">{c.email}</Td>
                <Td className="text-on-surface-variant">{c.phone ?? "—"}</Td>
                <Td>{c.orderCount}</Td>
                <Td>{formatMoney(toCents(c.totalSpent ?? "0"))}</Td>
                <Td className="text-on-surface-variant">{new Date(c.createdAt).toLocaleDateString()}</Td>
                <Td className="text-end">
                  <Link href={`/admin/customers/${c.id}`} className="text-sm font-semibold text-primary hover:underline">
                    View
                  </Link>
                </Td>
              </Tr>
            ))}
            {rows.length === 0 && <EmptyRow colSpan={7}>No customers yet.</EmptyRow>}
          </tbody>
        </Table>
        <Pagination basePath="/admin/customers" page={page} total={total} />
      </div>
    </div>
  );
}
