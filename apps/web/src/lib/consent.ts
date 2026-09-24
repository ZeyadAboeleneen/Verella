"use client";

import { useSyncExternalStore } from "react";

/**
 * The visitor's analytics-cookie choice, kept in a first-party cookie so it
 * survives across visits. `null` = not asked yet. Essential cookies (session,
 * bag, language) don't need consent and aren't governed by this.
 */
export type Consent = "granted" | "denied" | null;

const COOKIE = "verella_consent";
const MAX_AGE = 60 * 60 * 24 * 180; // re-ask after six months
const listeners = new Set<() => void>();
/** Set when the visitor reopens the banner from the footer. */
let reopened = false;

function read(): Consent {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=(granted|denied)`));
  return (match?.[1] as Consent) ?? null;
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setConsent(value: "granted" | "denied") {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${value}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`;
  reopened = false;
  emit();
}

/** Show the banner again (footer "Cookie settings" link). */
export function reopenConsent() {
  reopened = true;
  emit();
}

/** Current consent; `null` during SSR and until the visitor chooses. */
export function useConsent(): Consent {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** Whether the banner should be showing right now. */
export function useConsentBannerOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => reopened || read() === null,
    () => false,
  );
}
