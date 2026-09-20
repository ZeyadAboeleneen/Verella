"use client";

import { useState, useTransition } from "react";
import { resendVerificationEmailAction } from "@/lib/auth/email-verification";

export function VerifyEmailBanner() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resend() {
    setError(null);
    startTransition(async () => {
      const result = await resendVerificationEmailAction();
      if ("error" in result) setError(result.error);
      else setSent(true);
    });
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">
      <p>Please verify your email address to secure your account.</p>
      {sent ? (
        <span className="font-semibold">Verification email sent.</span>
      ) : (
        <button type="button" onClick={resend} disabled={pending} className="font-semibold underline disabled:opacity-60">
          {pending ? "Sending…" : "Resend email"}
        </button>
      )}
      {error && <p className="w-full text-xs text-error">{error}</p>}
    </div>
  );
}
