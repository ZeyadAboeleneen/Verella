"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/auth/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, FormError } from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n";

export function ForgotPasswordForm({ dict }: { dict: Dictionary }) {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, null);
  const sent = state !== null && "success" in state;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.auth.forgotTitle}</CardTitle>
        <p className="mt-1 text-sm text-on-surface-variant">{dict.auth.forgotSubtitle}</p>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="rounded-lg bg-secondary-container px-3 py-3 text-sm text-on-secondary-container" role="status">
            {dict.auth.forgotSent}
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            {state && "error" in state && <FormError>{state.error}</FormError>}
            <div>
              <Label htmlFor="email">{dict.auth.email}</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "…" : dict.auth.forgotSubmit}
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="font-medium text-primary hover:underline">
            {dict.auth.backToLogin}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
