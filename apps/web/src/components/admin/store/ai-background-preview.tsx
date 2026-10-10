"use client";

import { useEffect, useState } from "react";
import { Loader2, Maximize2, Sparkles, X } from "lucide-react";
import { previewStyledImageAction } from "@/lib/store/actions";

type State = { status: "loading" } | { status: "ready"; url: string } | { status: "error"; message: string };

/**
 * Shows the AI styled version of the product's first photo as soon as it's
 * added (made on the server — about a minute the first time, instant after).
 * Click it to view it full size. Saving the product reuses this exact image.
 */
export function AiBackgroundPreview({
  sourceId,
  sourceUrl,
  existingUrl,
}: {
  sourceId: number;
  sourceUrl: string;
  /** The product already has this AI cover — show it, don't make one. */
  existingUrl?: string | null;
}) {
  const [state, setState] = useState<State>(existingUrl ? { status: "ready", url: existingUrl } : { status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [viewing, setViewing] = useState<string | null>(null);

  useEffect(() => {
    if (existingUrl && attempt === 0) return;
    let cancelled = false;
    previewStyledImageAction(sourceId)
      .then((res) => {
        if (cancelled) return;
        setState("error" in res ? { status: "error", message: res.error } : { status: "ready", url: res.data!.url });
      })
      .catch(() => !cancelled && setState({ status: "error", message: "Couldn't reach the server." }));
    return () => {
      cancelled = true;
    };
  }, [sourceId, attempt, existingUrl]);

  return (
    <div className="mt-4">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-on-surface">
        <Sparkles size={14} className="text-gold-ink" /> AI preview — this becomes the cover when you save
      </p>
      <div className="flex flex-wrap items-start gap-4">
        <figure className="w-28">
          <button type="button" onClick={() => setViewing(sourceUrl)} className="group relative block aspect-[4/5] w-28 overflow-hidden rounded-xl border border-outline-variant">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sourceUrl} alt="Your photo" className="h-full w-full object-cover" />
            <Maximize2 size={14} className="absolute end-1.5 top-1.5 rounded bg-black/50 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
          <figcaption className="mt-1 text-center text-[11px] text-on-surface-variant">Your photo</figcaption>
        </figure>

        <figure className="w-28">
          {state.status === "ready" ? (
            <button
              type="button"
              onClick={() => setViewing(state.url)}
              className="group relative block aspect-[4/5] w-28 overflow-hidden rounded-xl border-2 border-gold"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={state.url} alt="AI styled photo" className="h-full w-full object-cover" />
              <Maximize2 size={14} className="absolute end-1.5 top-1.5 rounded bg-black/50 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ) : (
            <div className="flex aspect-[4/5] w-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant p-2 text-center text-[11px] text-on-surface-variant">
              {state.status === "loading" ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Making the AI photo… (up to a minute)
                </>
              ) : (
                <>
                  <span className="text-error">{state.message}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setState({ status: "loading" });
                      setAttempt((n) => n + 1);
                    }}
                    className="underline"
                  >
                    Try again
                  </button>
                </>
              )}
            </div>
          )}
          <figcaption className="mt-1 text-center text-[11px] text-on-surface-variant">AI background</figcaption>
        </figure>
      </div>

      {viewing && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setViewing(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewing} alt="" className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <button type="button" onClick={() => setViewing(null)} aria-label="Close" className="absolute end-5 top-5 rounded-full bg-white/15 p-2 text-white hover:bg-white/25">
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
