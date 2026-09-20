"use client";

export interface AddedToCartPayload {
  name?: string;
  image?: string | null;
  meta?: string;
}

type Listener = (payload: AddedToCartPayload) => void;
const listeners = new Set<Listener>();

/** Fired by ProductCard/ProductDetail on a successful add — the Navbar (which
 * owns the actual cart icon) is the only place that can anchor the toast to
 * it, so product components just broadcast and don't render anything themselves. */
export function notifyAddedToCart(payload: AddedToCartPayload) {
  listeners.forEach((l) => l(payload));
}

export function subscribeAddedToCart(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
