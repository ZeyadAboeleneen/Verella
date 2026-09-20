import "server-only";
import { cookies } from "next/headers";

const GUEST_CART_COOKIE = "verella_guest_cart";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Returns the guest cart token if one exists — does NOT create one (use ensureGuestCartToken for that). */
export async function getGuestCartToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(GUEST_CART_COOKIE)?.value ?? null;
}

/** Reads the existing guest cart token or mints + persists a new one. */
export async function ensureGuestCartToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(GUEST_CART_COOKIE)?.value;
  if (existing) return existing;

  const token = crypto.randomUUID();
  store.set(GUEST_CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return token;
}

export async function clearGuestCartCookie(): Promise<void> {
  const store = await cookies();
  store.delete(GUEST_CART_COOKIE);
}
