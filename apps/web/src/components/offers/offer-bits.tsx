"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

export interface OfferLabels {
  kicker: string;
  title: string;
  subtitle: string;
  code: string;
  copy: string;
  copied: string;
  endsIn: string;
  endsToday: string;
  days: string;
  hours: string;
  minutes: string;
  shopNow: string;
  close: string;
  previous: string;
  next: string;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers / insecure origins (LAN dev): fall back to a hidden textarea.
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Tap-to-copy discount code chip. */
export function CopyCode({
  code,
  labels,
  className = "",
  compact = false,
}: {
  code: string;
  labels: Pick<OfferLabels, "code" | "copy" | "copied">;
  className?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (await copyText(code)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }
      }}
      aria-label={`${labels.copy} ${code}`}
      className={`group/code relative z-10 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dashed transition-colors ${
        compact ? "h-6 px-2.5 text-[11px]" : "h-9 px-3.5 text-xs"
      } ${className}`}
    >
      {!compact && <span className="opacity-70">{labels.code}</span>}
      <span dir="ltr" className="font-semibold tracking-[0.12em]">
        {code}
      </span>
      {copied ? <Check size={compact ? 12 : 14} aria-hidden="true" /> : <Copy size={compact ? 11 : 13} className="opacity-70" aria-hidden="true" />}
      <span className="sr-only" aria-live="polite">
        {copied ? labels.copied : ""}
      </span>
    </button>
  );
}

/** "Ends in 2d 5h" — only shown for the last 14 days, refreshed every minute. */
export function useCountdown(endsAt: string | null, labels: Pick<OfferLabels, "endsIn" | "endsToday" | "days" | "hours" | "minutes">) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // Set on mount only (not during SSR) so server and client markup match.
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);
  if (!endsAt || now === null) return null;
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0 || ms > 14 * 86_400_000) return null;
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.max(1, Math.floor((ms % 3_600_000) / 60_000));
  const parts = d > 0 ? [`${d}${labels.days}`, `${h}${labels.hours}`] : h > 0 ? [`${h}${labels.hours}`, `${m}${labels.minutes}`] : [`${m}${labels.minutes}`];
  return d === 0 ? `${labels.endsToday} · ${parts.join(" ")}` : `${labels.endsIn} ${parts.join(" ")}`;
}
