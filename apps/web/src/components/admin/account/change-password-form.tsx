"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { changePasswordAction } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, FormError } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [newPassword, setNewPassword] = useState("");
  const succeeded = state !== null && "success" in state;

  // Clear the controlled field during render (React's derived-state pattern);
  // the imperative DOM reset stays in an effect.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (succeeded) setNewPassword("");
  }
  useEffect(() => {
    if (succeeded) formRef.current?.reset();
  }, [succeeded]);

  useEffect(() => {
    if (state && "error" in state) toast(state.error, "error");
    else if (succeeded) toast("Password updated.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <p className="mt-1 text-sm text-on-surface-variant">
          Update the password for your own account. You&apos;ll stay signed in.
        </p>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          {state && "error" in state && <FormError>{state.error}</FormError>}
          {succeeded && (
            <p className="rounded-lg bg-secondary-container px-3 py-2 text-sm text-on-secondary-container" role="status">
              Your password has been updated.
            </p>
          )}
          <div>
            <Label htmlFor="currentPassword">Current password</Label>
            <PasswordInput id="currentPassword" name="currentPassword" required autoComplete="current-password" />
          </div>
          <div>
            <Label htmlFor="newPassword">New password</Label>
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
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <PasswordInput id="confirmPassword" name="confirmPassword" required minLength={8} autoComplete="new-password" />
          </div>
          <Button type="submit" loading={pending}>
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
