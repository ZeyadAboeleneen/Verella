"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@verella/db";
import { updateOrderStatusAction } from "@/lib/orders/actions";
import { Button } from "@/components/ui/button";

const STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "ready_for_pickup",
  "completed",
  "cancelled",
];

export function StatusUpdater({
  orderId,
  currentStatus,
  paidDepositFormatted = null,
}: {
  orderId: number;
  currentStatus: OrderStatus;
  /** Formatted deposit when one was paid (order confirmed) — cancelling then asks refund or keep. */
  paidDepositFormatted?: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [depositDecision, setDepositDecision] = useState<
    "refund" | "keep" | null
  >(null);
  const askDeposit = status === "cancelled" && !!paidDepositFormatted;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus);
            setDepositDecision(null);
            setError(null);
          }}
          className="h-10 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface capitalize"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          disabled={
            pending ||
            status === currentStatus ||
            (askDeposit && !depositDecision)
          }
          onClick={() =>
            startTransition(async () => {
              const res = await updateOrderStatusAction(
                orderId,
                status,
                undefined,
                askDeposit ? depositDecision! : undefined,
              );
              if ("error" in res) setError(res.error);
              else router.refresh();
            })
          }
        >
          Update status
        </Button>
        {error && <span className="text-xs text-error">{error}</span>}
      </div>
      {askDeposit && (
        <div className="w-full max-w-sm rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">
            The customer paid a {paidDepositFormatted} deposit. What happens to
            it?
          </p>
          <div className="mt-2 space-y-1.5">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="depositDecision"
                checked={depositDecision === "refund"}
                onChange={() => setDepositDecision("refund")}
              />
              Refund the deposit to the customer
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="depositDecision"
                checked={depositDecision === "keep"}
                onChange={() => setDepositDecision("keep")}
              />
              Keep the deposit (counts as revenue)
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
