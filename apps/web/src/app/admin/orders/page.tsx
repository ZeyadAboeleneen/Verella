import Link from "@/components/LocaleLink";
import { and, desc, eq, count, gte, lt, sql } from "drizzle-orm";
import { AdminDateFilter } from "@/components/admin/admin-date-filter";
import { periodRange } from "@/lib/admin/date-range";
import { db, orders, type OrderStatus } from "@verella/db";
import { formatMoney, toCents } from "@verella/core";
import { Table, Thead, Th, Tr, Td, EmptyRow } from "@/components/admin/table";
import { Pagination, PAGE_SIZE } from "@/components/admin/pagination";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  ready_for_pickup: "Ready for pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; period?: string; from?: string; to?: string }>;
}) {
  const { status, page: pageParam, period: rawPeriod, from: rawFrom, to: rawTo } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const range = periodRange(rawPeriod, rawFrom, rawTo);
  const period = range?.period;
  const whereClause = and(
    status ? eq(orders.status, status as OrderStatus) : undefined,
    range?.from ? gte(orders.placedAt, range.from) : undefined,
    range?.to ? lt(orders.placedAt, range.to) : undefined,
  );

  const [rows, [{ total, revenue }]] = await Promise.all([
    db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt)).limit(PAGE_SIZE).offset(offset),
    db
      .select({ total: count(), revenue: sql<string>`coalesce(sum(case when ${orders.status} <> 'cancelled' then ${orders.grandTotal} else 0 end), 0)` })
      .from(orders)
      .where(whereClause),
  ]);
  const statusHref = (key?: string) => {
    const p = new URLSearchParams();
    if (key) p.set("status", key);
    if (period) p.set("period", period);
    if (period === "custom" && rawFrom) p.set("from", rawFrom);
    if (period === "custom" && rawTo) p.set("to", rawTo);
    if (rawFrom) p.set("from", rawFrom);
    if (rawTo) p.set("to", rawTo);
    const qs = p.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-on-surface">Orders</h1>
        <div>
          <AdminDateFilter />
        </div>
      </div>
      {period && (
        <p className="mt-2 text-xs text-on-surface-variant">
          {range?.label}: {total} {total === 1 ? "order" : "orders"} · {formatMoney(toCents(revenue))} (excluding cancelled)
        </p>
      )}

      <div className="my-4 flex flex-wrap gap-2">
        <Link
          href={statusHref()}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${!status ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
        >
          All
        </Link>
        {Object.entries(STATUS_LABEL).map(([key, label]) => (
          <Link
            key={key}
            href={statusHref(key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${status === key ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <Table>
        <Thead>
          <tr>
            <Th>Order #</Th>
            <Th>Placed</Th>
            <Th>Fulfillment</Th>
            <Th>Total</Th>
            <Th>Status</Th>
            <Th className="text-end">Actions</Th>
          </tr>
        </Thead>
        <tbody>
          {rows.map((o) => (
            <Tr key={o.id}>
              <Td className="font-mono font-medium">{o.orderNumber}</Td>
              <Td className="text-on-surface-variant">{new Date(o.placedAt).toLocaleString()}</Td>
              <Td className="text-on-surface-variant capitalize">{o.fulfillmentType}</Td>
              <Td>{formatMoney(toCents(o.grandTotal))}</Td>
              <Td>
                <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-xs text-on-surface-variant">
                  {STATUS_LABEL[o.status]}
                </span>
              </Td>
              <Td className="text-end">
                <Link href={`/admin/orders/${o.id}`} className="text-sm font-semibold text-primary hover:underline">
                  View
                </Link>
              </Td>
            </Tr>
          ))}
          {rows.length === 0 && <EmptyRow colSpan={6}>No orders yet.</EmptyRow>}
        </tbody>
      </Table>
      <Pagination basePath="/admin/orders" params={{ status, period, from: rawFrom, to: rawTo }} page={page} total={total} />
    </div>
  );
}
