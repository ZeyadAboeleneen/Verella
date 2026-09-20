"use client";

import { useEffect } from "react";

/** Forces the menu page to always open at the top, even if the browser tries to restore a prior scroll position (including bfcache back/forward restores, which skip React's mount effects) or a stale #section hash is in the URL. */
export function ScrollToTop() {
  useEffect(() => {
    if (window.history.scrollRestoration) window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const onPageShow = () => window.scrollTo(0, 0);
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  return null;
}
