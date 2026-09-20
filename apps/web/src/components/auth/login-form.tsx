"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, FormError } from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n";

export function LoginForm({ dict, callbackUrl }: { dict: Dictionary; callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.auth.loginTitle}</CardTitle>
        <p className="mt-1 text-sm text-on-surface-variant">{dict.auth.loginSubtitle}</p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
          {state && "error" in state && <FormError>{state.error}</FormError>}
          <div>
            <Label htmlFor="email">{dict.auth.email}</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{dict.auth.password}</Label>
              <Link href="/forgot-password" className="mb-1.5 text-xs font-medium text-primary hover:underline">
                {dict.auth.forgotPassword}
              </Link>
            </div>
            <PasswordInput id="password" name="password" required autoComplete="current-password" />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "…" : dict.auth.submitLogin}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-on-surface-variant">
          {dict.auth.noAccount}{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            {dict.auth.signUpLink}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
