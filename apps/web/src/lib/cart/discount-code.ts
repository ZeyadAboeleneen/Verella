"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { previewOrderTotalsAction } from "@/lib/checkout/actions";
import type { ActionResult } from "@/lib/auth/rbac";
import { CART_CODE_COOKIE } from "./discount-code-cookie";

/** Validates the code against the current cart (same check as checkout), then remembers it. */
export async function applyCartDiscountCodeAction(rawCode: string): Promise<ActionResult> {
  const code = rawCode.trim().toUpperCase().slice(0, 50);
  if (!code) return { error: "Enter a code." };
  const preview = await previewOrderTotalsAction("pickup", code);
  if ("error" in preview) return preview;
  if (preview.data.discountError) return { error: preview.data.discountError };

  (await cookies()).set(CART_CODE_COOKIE, code, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7 });
  revalidatePath("/cart");
  return { success: true };
}

export async function removeCartDiscountCodeAction(): Promise<ActionResult> {
  (await cookies()).delete(CART_CODE_COOKIE);
  revalidatePath("/cart");
  return { success: true };
}
