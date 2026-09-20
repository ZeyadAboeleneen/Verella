"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { reviewPaymentAction } from "@/lib/payments/review-actions";
import { Button } from "@/components/ui/button";

export function PaymentReviewActions({ paymentId }: { paymentId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function review(decision: "approved" | "rejected") {
    startTransition(async () => {
      const res = await reviewPaymentAction(paymentId, decision);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="primary" disabled={pending} onClick={() => review("approved")}>
        <Check size={14} /> Approve
      </Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => review("rejected")}>
        <X size={14} /> Reject
      </Button>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
