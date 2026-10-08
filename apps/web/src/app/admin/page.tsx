import { count, eq, inArray, lt, and, isNull, desc, gte, sql } from "drizzle-orm";
import { db, orders, payments, storeProducts, orderItems, customers } from "@verella/db";
import { formatMoney, toCents } from "@verella/core";
import Link from "@/components/LocaleLink";
import { VMark } from "@/components/brand/Logo";
import { RevenueBarChart, OrderStatusDonut } from "@/components/admin/dashboard-charts";
import type { OrderStatus } from "@verella/db";
import { AdminDateFilter } from "@/components/admin/admin-date-filter";
import { periodRange } from "@/lib/admin/date-range";

// ─── Data queries ──────────────────────────────────────────────────────────

/**
 * Revenue an order has earned so far (products only, no delivery fee):
 *  - completed → the full amount;
 *  - confirmed / in progress with a cash-on-delivery deposit → the deposit
 *    (the rest is counted once it's delivered);
 *  - cancelled with the deposit kept (not refunded) → the deposit;
 *  - pending / other cancelled → nothing.
 */
const earnedRevenue = sql<string>`CASE
  WHEN ${orders.status} = 'completed' THEN ${orders.grandTotal} - ${orders.deliveryFee}
  WHEN ${orders.status} IN ('confirmed', 'preparing', 'out_for_delivery', 'ready_for_pickup')
    THEN LEAST(${orders.depositAmount}, ${orders.grandTotal} - ${orders.deliveryFee})
  WHEN ${orders.status} = 'cancelled' AND ${orders.depositKept}
    THEN LEAST(${orders.depositAmount}, ${orders.grandTotal} - ${orders.deliveryFee})
  ELSE 0 END`;
// "cancelled" only adds a deposit the store kept (see earnedRevenue).
const earningStatuses: OrderStatus[] = ["confirmed", "preparing", "out_for_delivery", "ready_for_pickup", "completed", "cancelled"];

async function getKpis() {
  const [[orderCount], [revenue], [pendingPayments], [lowStock], [customerCount]] = await Promise.all([
    db.select({ value: count() }).from(orders),
    db.select({ value: sql<string>`SUM(${earnedRevenue})` }).from(orders).where(inArray(orders.status, earningStatuses)),
    db.select({ value: count() }).from(payments).where(inArray(payments.status, ["pending", "submitted"])),
    db.select({ value: count() }).from(storeProducts).where(and(eq(storeProducts.isActive, true), lt(storeProducts.stockQty, 10), isNull(storeProducts.deletedAt))),
    db.select({ value: count() }).from(customers),
  ]);
  return {
    orderCount: orderCount?.value ?? 0,
    revenueCents: toCents(revenue?.value ?? "0"),
    pendingPayments: pendingPayments?.value ?? 0,
    lowStock: lowStock?.value ?? 0,
    customerCount: customerCount?.value ?? 0,
  };
}

async function getOrdersByStatus() {
  const rows = await db
    .select({ status: orders.status, count: count() })
    .from(orders)
    .groupBy(orders.status);
  const all: OrderStatus[] = ["pending", "confirmed", "preparing", "out_for_delivery", "ready_for_pickup", "completed", "cancelled"];
  return all.map((s) => ({ name: s, value: rows.find((r) => r.status === s)?.count ?? 0 }));
}

/**
 * Completed revenue for a range, one bar per day (≤ 62 days) or per month.
 * No range picked → last 7 days.
 */
async function getRevenueSeries(range: ReturnType<typeof periodRange>) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  let from = range?.from ?? new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  const to = range?.to ?? tomorrow; // exclusive
  if (!range?.from) {
    // "Until <date>" with no start: begin at the first order.
    if (range) {
      const [first] = await db.select({ at: sql<Date>`MIN(${orders.placedAt})` }).from(orders);
      if (first?.at) {
        const f = new Date(first.at);
        from = new Date(f.getFullYear(), f.getMonth(), f.getDate());
      }
    }
  }

  const rows = await db
    .select({ placedAt: orders.placedAt, total: earnedRevenue })
    .from(orders)
    .where(and(inArray(orders.status, earningStatuses), gte(orders.placedAt, from), lt(orders.placedAt, to)));

  const spanDays = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  const byMonth = spanDays > 62;
  const keyOf = (d: Date) => (byMonth ? `${d.getFullYear()}-${d.getMonth()}` : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);

  const totals = new Map<string, number>();
  for (const r of rows) {
    const k = keyOf(new Date(r.placedAt));
    totals.set(k, (totals.get(k) ?? 0) + toCents(r.total));
  }

  const series: { day: string; revenue: number }[] = [];
  const cursor = byMonth ? new Date(from.getFullYear(), from.getMonth(), 1) : new Date(from);
  while (cursor < to) {
    const label = byMonth
      ? cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      : spanDays <= 7
        ? cursor.toLocaleDateString("en-US", { weekday: "short" })
        : cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    series.push({ day: label, revenue: totals.get(keyOf(cursor)) ?? 0 });
    if (byMonth) cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setDate(cursor.getDate() + 1);
  }
  const totalCents = series.reduce((s, p) => s + p.revenue, 0);
  return { series, totalCents, label: range?.label ?? "Last 7 days" };
}

async function getRecentOrders(limit = 8) {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      grandTotal: orders.grandTotal,
      placedAt: orders.placedAt,
      fulfillmentType: orders.fulfillmentType,
    })
    .from(orders)
    .orderBy(desc(orders.placedAt))
    .limit(limit);
}

async function getTopProducts(limit = 5) {
  const rows = await db
    .select({
      productId: orderItems.storeProductId,
      nameSnapshot: orderItems.nameSnapshot,
      totalQty: sql<number>`SUM(${orderItems.quantity})`.mapWith(Number),
      revenue: sql<string>`SUM(${orderItems.lineTotal})`,
    })
    .from(orderItems)
    .groupBy(orderItems.storeProductId, orderItems.nameSnapshot)
    .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
    .limit(limit);
  return rows;
}

// ─── Status badge styling ──────────────────────────────────────────────────
const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:           "bg-amber-100 text-amber-800",
  confirmed:         "bg-blue-100 text-blue-800",
  preparing:         "bg-purple-100 text-purple-800",
  out_for_delivery:  "bg-cyan-100 text-cyan-800",
  ready_for_pickup:  "bg-emerald-100 text-emerald-800",
  completed:         "bg-gold/10 text-gold",
  cancelled:         "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending:           "Pending",
  confirmed:         "Confirmed",
  preparing:         "Preparing",
  out_for_delivery:  "Out for Delivery",
  ready_for_pickup:  "Ready",
  completed:         "Completed",
  cancelled:         "Cancelled",
};

// ─── Page ──────────────────────────────────────────────────────────────────
export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const range = periodRange(sp.period, sp.from, sp.to);
  const [kpis, statusData, revenue, recentOrders, topProducts] = await Promise.all([
    getKpis(),
    getOrdersByStatus(),
    getRevenueSeries(range),
    getRecentOrders(),
    getTopProducts(),
  ]);

  const kpiCards = [
    {
      label: "Total Orders",
      value: kpis.orderCount.toLocaleString(),
      icon: "receipt_long",
      color: "bg-blue-50 text-blue-600",
      border: "border-blue-100",
    },
    {
      label: "Revenue",
      value: formatMoney(kpis.revenueCents),
      icon: "payments",
      color: "bg-emerald-50 text-emerald-600",
      border: "border-emerald-100",
    },
    {
      label: "Customers",
      value: kpis.customerCount.toLocaleString(),
      icon: "group",
      color: "bg-purple-50 text-purple-600",
      border: "border-purple-100",
    },
    {
      label: "Awaiting Payment Review",
      value: kpis.pendingPayments.toLocaleString(),
      icon: "schedule",
      color: "bg-amber-50 text-amber-600",
      border: "border-amber-100",
    },
    {
      label: "Low Stock Products",
      value: kpis.lowStock.toLocaleString(),
      icon: "inventory_2",
      color: "bg-red-50 text-red-600",
      border: "border-red-100",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-beige bg-surface-container-low/40 shadow-xs">
          <VMark size={30} className="text-gold" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-on-surface">Dashboard</h1>
          <p className="mt-0.5 text-sm text-on-surface-variant">
            Welcome back! Here&apos;s how the store is doing today.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((c) => (
          <div
            key={c.label}
            className={`rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${c.border}`}
          >
            <div className={`mb-3 inline-flex items-center justify-center rounded-xl p-2.5 ${c.color}`}>
              <span className="material-symbols-outlined text-xl select-none">{c.icon}</span>
            </div>
            <p className="text-xs font-medium text-on-surface-variant">{c.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-on-surface">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Bar Chart — takes 2 cols */}
        <div className="lg:col-span-2 rounded-2xl border border-outline-variant/60 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-on-surface">Revenue — {revenue.label}</h2>
              <p className="text-xs text-on-surface-variant">
                Completed orders + paid deposits, excluding delivery fees · Total <span className="font-semibold text-on-surface">{formatMoney(revenue.totalCents)}</span>
              </p>
            </div>
            <AdminDateFilter emptyLabel="Last 7 days" />
          </div>
          <RevenueBarChart data={revenue.series} />
        </div>

        {/* Order Status Donut */}
        <div className="rounded-2xl border border-outline-variant/60 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-on-surface">Orders by Status</h2>
              <p className="text-xs text-on-surface-variant">All time breakdown</p>
            </div>
            <span className="material-symbols-outlined text-gold text-2xl select-none">donut_large</span>
          </div>
          <OrderStatusDonut data={statusData} />
        </div>
      </div>

      {/* Bottom Row: Recent Orders + Top Products */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="lg:col-span-2 rounded-2xl border border-outline-variant/60 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
            <h2 className="font-display text-base font-semibold text-on-surface">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs font-semibold text-gold hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-outline-variant/30">
            {recentOrders.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-on-surface-variant">No orders yet.</p>
            )}
            {recentOrders.map((o) => (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="flex items-center justify-between gap-3 px-6 py-3.5 hover:bg-surface-container/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="material-symbols-outlined text-on-surface-variant text-base select-none shrink-0">
                    {o.fulfillmentType === "delivery" ? "local_shipping" : "storefront"}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium text-on-surface truncate">{o.orderNumber}</p>
                    <p className="text-xs text-on-surface-variant">
                      {new Date(o.placedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[o.status as OrderStatus]}`}>
                    {STATUS_LABEL[o.status as OrderStatus]}
                  </span>
                  <span className="text-sm font-semibold text-on-surface">
                    {formatMoney(toCents(o.grandTotal))}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="rounded-2xl border border-outline-variant/60 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
            <h2 className="font-display text-base font-semibold text-on-surface">Top Products</h2>
            <Link href="/admin/store/products" className="text-xs font-semibold text-gold hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-outline-variant/30">
            {topProducts.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-on-surface-variant">No sales yet.</p>
            )}
            {topProducts.map((p, i) => (
              <div key={`${p.productId}-${i}`} className="flex items-center gap-3 px-6 py-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/10 text-xs font-bold text-gold">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{p.nameSnapshot}</p>
                  <p className="text-xs text-on-surface-variant">{p.totalQty} sold</p>
                </div>
                <span className="text-sm font-semibold text-on-surface shrink-0">
                  {formatMoney(toCents(p.revenue ?? "0"))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="rounded-2xl border border-outline-variant/60 bg-white p-6 shadow-sm">
        <h2 className="font-display text-base font-semibold text-on-surface mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { href: "/admin/orders", icon: "receipt_long", label: "Manage Orders" },
            { href: "/admin/store/products/new", icon: "add_box", label: "Add Product" },
            { href: "/admin/payments", icon: "payments", label: "Review Payments" },
            { href: "/admin/discounts/new", icon: "local_offer", label: "Create Discount" },
            { href: "/admin/customers", icon: "group", label: "View Customers" },
            { href: "/admin/activity", icon: "history", label: "Activity Logs" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex items-center gap-2 rounded-full border border-beige bg-surface-container-low/60 px-4 py-2 text-xs font-semibold text-gold transition-all hover:bg-charcoal hover:text-white hover:border-charcoal"
            >
              <span className="material-symbols-outlined text-base select-none">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
