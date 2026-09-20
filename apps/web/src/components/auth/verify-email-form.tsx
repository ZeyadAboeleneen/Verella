"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { verifyEmailAction } from "@/lib/auth/email-verification";
import { Card, CardContent, CardHeader, CardTitle, FormError } from "@/components/ui/card";

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(verifyEmailAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (token && !submitted.current) {
      submitted.current = true;
      formRef.current?.requestSubmit();
    }
  }, [token]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
      </CardHeader>
      <CardContent>
        {!token ? (
          <FormError>This verification link is missing a token.</FormError>
        ) : state === null ? (
          <p className="text-sm text-on-surface-variant">Verifying…</p>
        ) : "success" in state ? (
          <>
            <p className="rounded-lg bg-secondary-container px-3 py-3 text-sm text-on-secondary-container" role="status">
              Your email has been verified.
            </p>
            <p className="mt-4 text-center text-sm">
              <Link href="/account" className="font-medium text-primary hover:underline">
                Go to my account
              </Link>
            </p>
          </>
        ) : (
          <FormError>{state.error}</FormError>
        )}
        <form ref={formRef} action={formAction} className="hidden">
          <input type="hidden" name="token" value={token} />
        </form>
      </CardContent>
    </Card>
  );
}
