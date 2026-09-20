"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registerAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, FormError } from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n";

export function RegisterForm({ dict }: { dict: Dictionary }) {
  const [state, formAction, pending] = useActionState(registerAction, null);
  const [password, setPassword] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.auth.registerTitle}</CardTitle>
        <p className="mt-1 text-sm text-on-surface-variant">{dict.auth.registerSubtitle}</p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state && "error" in state && <FormError>{state.error}</FormError>}
          <div>
            <Label htmlFor="fullName">{dict.auth.fullName}</Label>
            <Input id="fullName" name="fullName" required autoComplete="name" />
          </div>
          <div>
            <Label htmlFor="email">{dict.auth.email}</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="phone">{dict.auth.phone}</Label>
            <Input id="phone" name="phone" type="tel" autoComplete="tel" />
          </div>
          <div>
            <Label htmlFor="password">{dict.auth.password}</Label>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordStrength password={password} />
          </div>
          <div>
            <Label htmlFor="confirmPassword">{dict.auth.confirmPassword}</Label>
            <PasswordInput id="confirmPassword" name="confirmPassword" required autoComplete="new-password" minLength={8} />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "…" : dict.auth.submitRegister}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-on-surface-variant">
          {dict.auth.haveAccount}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {dict.auth.signInLink}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
