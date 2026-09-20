"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, users, addresses } from "@verella/db";
import { changePasswordSchema, addressSchema, type AddressInput } from "@verella/core";
import { requireUser, AuthError, type ActionResult } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/activity/log";
import { getOrCreateCustomer } from "./queries";

/**
 * Lets any signed-in user change their own password. Verifies the current
 * password first, then stores a fresh bcrypt hash. Available in the dashboard
 * at /admin/account.
 */
export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let sessionUser;
  try {
    sessionUser = await requireUser();
  } catch (err) {
    if (err instanceof AuthError) return { error: "You must be signed in." };
    throw err;
  }

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const userId = Number(sessionUser.id);
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !user.passwordHash) return { error: "Account not found." };

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { error: "Your current password is incorrect." };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

  await logActivity({ actorUserId: userId, action: "user.password_changed", entityType: "user", entityId: userId });

  return { success: true };
}

async function requireCustomerId(): Promise<number | { error: string }> {
  try {
    const sessionUser = await requireUser();
    const customer = await getOrCreateCustomer(Number(sessionUser.id));
    return customer.id;
  } catch (err) {
    if (err instanceof AuthError) return { error: "You must be signed in." };
    throw err;
  }
}

export async function createAddressAction(input: AddressInput): Promise<ActionResult<{ id: number }>> {
  const customerId = await requireCustomerId();
  if (typeof customerId !== "number") return customerId;

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid address." };

  const id = await db.transaction(async (tx) => {
    if (parsed.data.isDefault) {
      await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.customerId, customerId));
    }
    const [row] = await tx.insert(addresses).values({ ...parsed.data, customerId }).$returningId();
    return row.id;
  });

  revalidatePath("/account/addresses");
  return { success: true, data: { id } };
}

export async function updateAddressAction(addressId: number, input: AddressInput): Promise<ActionResult> {
  const customerId = await requireCustomerId();
  if (typeof customerId !== "number") return customerId;

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid address." };

  const [existing] = await db.select({ id: addresses.id }).from(addresses).where(and(eq(addresses.id, addressId), eq(addresses.customerId, customerId))).limit(1);
  if (!existing) return { error: "Address not found." };

  await db.transaction(async (tx) => {
    if (parsed.data.isDefault) {
      await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.customerId, customerId));
    }
    await tx.update(addresses).set(parsed.data).where(eq(addresses.id, addressId));
  });

  revalidatePath("/account/addresses");
  return { success: true };
}

export async function deleteAddressAction(addressId: number): Promise<ActionResult> {
  const customerId = await requireCustomerId();
  if (typeof customerId !== "number") return customerId;

  const [existing] = await db.select({ id: addresses.id }).from(addresses).where(and(eq(addresses.id, addressId), eq(addresses.customerId, customerId))).limit(1);
  if (!existing) return { error: "Address not found." };

  await db.delete(addresses).where(eq(addresses.id, addressId));
  revalidatePath("/account/addresses");
  return { success: true };
}
