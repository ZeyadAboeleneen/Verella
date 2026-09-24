"use client";

import Link from "@/components/LocaleLink";
import Script from "next/script";
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { setConsent, useConsent, useConsentBannerOpen } from "@/lib/consent";
import { EASE_OUT } from "@/components/motion/Reveal";
import type { Dictionary } from "@/lib/i18n";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Google Analytics 4, loaded only after the visitor accepts analytics cookies.
 * GA4's enhanced measurement records client-side navigations on its own, so
 * no per-route tracking code is needed. If consent is later withdrawn, GA is
 * told to stop storing and its cookies are cleared.
 */
function Analytics({ measurementId }: { measurementId: string }) {
  const consent = useConsent();

  useEffect(() => {
    if (consent !== "denied" || !window.gtag) return;
    window.gtag("consent", "update", { analytics_storage: "denied" });
    for (const name of document.cookie.split("; ").map((c) => c.split("=")[0])) {
      if (name === "_ga" || name.startsWith("_ga_")) {
        const domain = location.hostname.replace(/^www\./, "");
        document.cookie = `${name}=; Path=/; Max-Age=0`;
        document.cookie = `${name}=; Path=/; Max-Age=0; Domain=.${domain}`;
      }
    }
  }, [consent]);

  if (consent !== "granted") return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});gtag('config',${JSON.stringify(measurementId)},{anonymize_ip:true});`}
      </Script>
    </>
  );
}

export function CookieConsent({ labels, measurementId }: { labels: Dictionary["cookies"]; measurementId?: string }) {
  const open = useConsentBannerOpen();

  return (
    <>
      {measurementId && <Analytics measurementId={measurementId} />}
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-live="polite"
            aria-label={labels.title}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-3xl rounded-2xl bg-charcoal p-5 text-ivory shadow-2xl md:inset-x-6 md:bottom-6 md:p-6"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
              <div className="flex-1 space-y-1.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-champagne">{labels.title}</p>
                <p className="text-sm leading-relaxed text-ivory/80">
                  {labels.body}{" "}
                  <Link href="/privacy" className="whitespace-nowrap text-ivory underline underline-offset-4 hover:text-champagne">
                    {labels.learnMore}
                  </Link>
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setConsent("denied")}
                  className="h-11 flex-1 rounded-full border border-ivory/25 px-5 text-xs font-medium uppercase tracking-[0.15em] text-ivory transition-colors hover:border-ivory md:flex-none"
                >
                  {labels.decline}
                </button>
                <button
                  type="button"
                  onClick={() => setConsent("granted")}
                  className="h-11 flex-1 rounded-full bg-ivory px-6 text-xs font-medium uppercase tracking-[0.15em] text-charcoal transition-colors hover:bg-champagne md:flex-none"
                >
                  {labels.accept}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
