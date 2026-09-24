import Link from "@/components/LocaleLink";
import NextImage from "next/image";
import { desc, eq, count, inArray } from "drizzle-orm";
import { db, payments, orders, paymentMethods, media } from "@verella/db";
import { formatMoney, toCents, WALLET_PAYMENT_METHODS } from "@verella/core";
import { authenticatedDeliveryUrl } from "@/lib/media/cloudinary";
import { Table, Thead, Th, Tr, Td, EmptyRow } from "@/components/admin/table";
import { PaymentReviewActions } from "@/components/admin/payments/review-actions";
import { Pagination, PAGE_SIZE } from "@/components/admin/pagination";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  // This page reviews wallet-transfer screenshots (InstaPay / Vodafone Cash) —
  // cash on delivery has no proof to approve, so it doesn't belong here.
  const whereClause = inArray(paymentMethods.code, [...WALLET_PAYMENT_METHODS]);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: payments.id,
        status: payments.status,
        amount: payments.amount,
        orderId: payments.orderId,
        orderNumber: orders.orderNumber,
        methodCode: paymentMethods.code,
        methodName: paymentMethods.name,
        proofObjectKey: media.objectKey,
      })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .innerJoin(paymentMethods, eq(paymentMethods.id, payments.methodId))
      .leftJoin(media, eq(media.id, payments.proofMediaId))
      .where(whereClause)
      .orderBy(desc(payments.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ total: count() }).from(payments).innerJoin(paymentMethods, eq(paymentMethods.id, payments.methodId)).where(whereClause),
  ]);

  const rowsWithProof = rows.map((r) => ({
    ...r,
    proofUrl: r.proofObjectKey ? authenticatedDeliveryUrl(r.proofObjectKey) : null,
  }));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-on-surface">Payments</h1>
      <p className="mt-1 text-sm text-on-surface-variant">Review InstaPay payment screenshots and approve or reject them.</p>

      <div className="mt-6">
        <Table>
          <Thead>
            <tr>
              <Th>Order</Th>
              <Th>Method</Th>
              <Th>Amount</Th>
              <Th>Proof</Th>
              <Th>Status</Th>
              <Th className="text-end">Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {rowsWithProof.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <Link href={`/admin/orders/${p.orderId}`} className="font-mono font-medium text-primary hover:underline">
                    {p.orderNumber}
                  </Link>
                </Td>
                <Td className="text-on-surface-variant">{p.methodName}</Td>
                <Td>{formatMoney(toCents(p.amount))}</Td>
                <Td>
                  {p.proofUrl ? (
                    <a href={p.proofUrl} target="_blank" rel="noreferrer" className="relative block h-12 w-12 overflow-hidden rounded-lg">
                      <NextImage src={p.proofUrl} alt="Payment proof" fill className="object-cover" />
                    </a>
                  ) : (
                    <span className="text-xs text-on-surface-variant">—</span>
                  )}
                </Td>
                <Td>
                  <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-xs capitalize text-on-surface-variant">
                    {p.status}
                  </span>
                </Td>
                <Td className="text-end">
                  {(p.status === "pending" || p.status === "submitted") && <PaymentReviewActions paymentId={p.id} />}
                </Td>
              </Tr>
            ))}
            {rowsWithProof.length === 0 && <EmptyRow colSpan={6}>No payments yet.</EmptyRow>}
          </tbody>
        </Table>
        <Pagination basePath="/admin/payments" page={page} total={total} />
      </div>
    </div>
  );
}
