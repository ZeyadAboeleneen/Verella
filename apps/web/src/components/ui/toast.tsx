"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export type ToastVariant = "success" | "error";

interface ToastEntry {
  id: number;
  message: string;
  variant: ToastVariant;
}

type Listener = (entry: ToastEntry) => void;
const listeners = new Set<Listener>();
let nextId = 1;

/** Fire-and-forget global toast — call from anywhere (server action result handlers, etc). */
export function toast(message: string, variant: ToastVariant = "success") {
  const entry: ToastEntry = { id: nextId++, message, variant };
  listeners.forEach((l) => l(entry));
}

const AUTO_DISMISS_MS = 4000;

/** Mount once near the root (e.g. AdminShell) — renders whatever toast() calls produce. */
export function Toaster() {
  const [entries, setEntries] = useState<ToastEntry[]>([]);

  useEffect(() => {
    const listener: Listener = (entry) => {
      setEntries((prev) => [...prev, entry]);
      setTimeout(() => {
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      }, AUTO_DISMISS_MS);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
      {entries.map((e) => (
        <div
          key={e.id}
          role="status"
          className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border p-3.5 shadow-lg backdrop-blur-sm ${
            e.variant === "success"
              ? "border-secondary/30 bg-secondary-container text-on-secondary-container"
              : "border-error/30 bg-error-container text-on-error-container"
          }`}
        >
          {e.variant === "success" ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          ) : (
            <XCircle size={18} className="mt-0.5 shrink-0" />
          )}
          <p className="text-sm font-medium leading-snug">{e.message}</p>
        </div>
      ))}
    </div>
  );
}
