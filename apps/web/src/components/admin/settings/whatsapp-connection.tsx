"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Loader2, MessageCircle, PowerOff, RefreshCw, Smartphone } from "lucide-react";
import { getWhatsAppStatusAction, resetWhatsAppSessionAction, type WhatsAppLinkState } from "@/lib/whatsapp/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

/**
 * Admin → Settings → WhatsApp. Link the store's WhatsApp once by scanning the
 * QR here; the session is saved by the gateway and survives restarts, so it
 * doesn't need scanning again unless the phone unlinks it.
 */
export function WhatsAppConnection() {
  const [status, setStatus] = useState<WhatsAppLinkState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const res = await getWhatsAppStatusAction().catch(() => null);
      if (cancelled) return;
      if (res && "error" in res) setError(res.error);
      else if (res) {
        setError(null);
        setStatus(res.data);
      }
      // A fresh QR every ~20s from WhatsApp — poll quickly while waiting for a scan.
      const next = res && "data" in res && res.data.state === "connected" ? 20_000 : 3_000;
      timer = setTimeout(poll, next);
    }
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  function relink(confirmFirst: boolean) {
    if (confirmFirst && !window.confirm("Unlink this WhatsApp number? Order invoices stop until a phone is linked again.")) return;
    startTransition(async () => {
      const res = await resetWhatsAppSessionAction();
      if ("error" in res) toast(res.error, "error");
      else {
        setStatus({ state: "starting" });
        toast("Scan the new QR code to link WhatsApp.");
      }
    });
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle size={18} /> WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-on-surface-variant">
          Order invoices are sent automatically from this WhatsApp number. Link it once — it stays linked after
          restarts.
        </p>

        {error ? (
          <p className="text-sm text-error">{error}</p>
        ) : status === null ? (
          <p className="flex items-center gap-2 text-sm text-on-surface-variant">
            <Loader2 size={16} className="animate-spin" /> Checking connection…
          </p>
        ) : status.state === "connected" ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-outline-variant p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={22} className="text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-on-surface">Connected</p>
                <p className="text-xs text-on-surface-variant" dir="ltr">
                  {[status.name, status.phone].filter(Boolean).join(" · ") || "Linked device"}
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => relink(true)} loading={pending}>
              <PowerOff size={14} /> Unlink / use another number
            </Button>
          </div>
        ) : status.state === "qr" ? (
          <div className="flex flex-col items-center gap-5 rounded-xl border border-outline-variant p-5 sm:flex-row sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element -- data: URL generated on the server */}
            <img src={status.qrDataUrl} alt="WhatsApp link QR code" width={220} height={220} className="rounded-lg bg-white p-2" />
            <ol className="list-decimal space-y-2 ps-5 text-sm text-on-surface">
              <li>Open WhatsApp on the store&apos;s phone.</li>
              <li>
                Tap <strong>Settings</strong> (or ⋮) → <strong>Linked devices</strong> → <strong>Link a device</strong>.
              </li>
              <li>Point the phone at this code. It refreshes by itself every few seconds.</li>
            </ol>
          </div>
        ) : status.state === "logged_out" ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-outline-variant p-4">
            <div className="flex items-center gap-3">
              <Smartphone size={22} className="text-on-surface-variant" />
              <p className="text-sm text-on-surface">This WhatsApp was unlinked from the phone.</p>
            </div>
            <Button type="button" onClick={() => relink(false)} loading={pending}>
              <RefreshCw size={14} /> Link again
            </Button>
          </div>
        ) : status.state === "starting" ? (
          <p className="flex items-center gap-2 text-sm text-on-surface-variant">
            <Loader2 size={16} className="animate-spin" /> Preparing a QR code…
          </p>
        ) : (
          <div className="rounded-xl border border-outline-variant p-4 text-sm text-on-surface">
            <p className="font-medium">The WhatsApp service isn&apos;t running.</p>
            <p className="mt-1 text-xs text-on-surface-variant">
              On the live server it runs in Docker: <code dir="ltr">docker compose --env-file ../.env up -d whatsapp</code> (from the{" "}
              <code dir="ltr">docker</code> folder). On a dev PC: <code dir="ltr">cd openwa; node index.js</code>. This page updates by itself.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
