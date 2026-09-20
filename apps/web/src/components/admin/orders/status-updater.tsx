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

export function StatusUpdater({ orderId, currentStatus }: { orderId: number; currentStatus: OrderStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as OrderStatus)}
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
        disabled={pending || status === currentStatus}
        onClick={() =>
          startTransition(async () => {
            const res = await updateOrderStatusAction(orderId, status);
            if ("error" in res) setError(res.error);
            else router.refresh();
          })
        }
      >
        Update status
      </Button>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
