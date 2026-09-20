"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import type { ActionResult } from "@/lib/auth/rbac";
import { toast } from "@/components/ui/toast";

export function DeleteButton({
  action,
  confirmText = "Delete this item? This cannot be undone.",
  successMessage = "Deleted.",
}: {
  action: () => Promise<ActionResult>;
  confirmText?: string;
  successMessage?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(confirmText)) return;
          setError(null);
          startTransition(async () => {
            const res = await action();
            if ("error" in res) {
              setError(res.error);
              toast(res.error, "error");
            } else {
              toast(successMessage);
              router.refresh();
            }
          });
        }}
        className="text-error hover:opacity-70 active:scale-90 transition-transform disabled:opacity-40 disabled:active:scale-100"
        title="Delete"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
      </button>
      {error && <span className="ms-2 text-xs text-error">{error}</span>}
    </span>
  );
}
