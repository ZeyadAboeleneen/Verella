"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/lib/auth/password-reset";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, FormError } from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n";

export function ResetPasswordForm({ dict, token }: { dict: Dictionary; token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, null);
  const [newPassword, setNewPassword] = useState("");
  const done = state !== null && "success" in state;

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dict.auth.resetTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <FormError>{dict.auth.resetInvalid}</FormError>
          <p className="mt-4 text-center text-sm">
            <Link href="/forgot-password" className="font-medium text-primary hover:underline">
              {dict.auth.forgotTitle}
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.auth.resetTitle}</CardTitle>
        <p className="mt-1 text-sm text-on-surface-variant">{dict.auth.resetSubtitle}</p>
      </CardHeader>
      <CardContent>
        {done ? (
          <>
            <p className="rounded-lg bg-secondary-container px-3 py-3 text-sm text-on-secondary-container" role="status">
              {dict.auth.resetSuccess}
            </p>
            <p className="mt-4 text-center text-sm">
              <Link href="/login" className="font-medium text-primary hover:underline">
                {dict.auth.signInLink}
              </Link>
            </p>
          </>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            {state && "error" in state && <FormError>{state.error}</FormError>}
            <div>
              <Label htmlFor="newPassword">{dict.auth.newPassword}</Label>
              <PasswordInput
                id="newPassword"
                name="newPassword"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <PasswordStrength password={newPassword} />
            </div>
            <div>
              <Label htmlFor="confirmPassword">{dict.auth.confirmPassword}</Label>
              <PasswordInput id="confirmPassword" name="confirmPassword" required minLength={8} autoComplete="new-password" />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "…" : dict.auth.resetSubmit}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
