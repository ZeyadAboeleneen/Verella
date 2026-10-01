"use server";

import QRCode from "qrcode";
import { guardPermission, type ActionResult } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/activity/log";
import { getGatewayStatus, resetGatewaySession } from "./service";
import { jidToLocalPhone } from "./phone";

export type WhatsAppLinkState =
  | { state: "offline" } // gateway process not running
  | { state: "starting" } // running, QR not ready yet
  | { state: "qr"; qrDataUrl: string } // waiting to be scanned
  | { state: "connected"; phone: string | null; name: string | null }
  | { state: "logged_out" }; // unlinked from the phone — needs a new link

/**
 * WhatsApp link status for Admin → Settings. The browser only ever talks to
 * this action; the gateway itself stays internal. The QR is rendered to an
 * image here on the server, so no third-party QR service ever sees it.
 */
export async function getWhatsAppStatusAction(): Promise<ActionResult<WhatsAppLinkState>> {
  const guard = await guardPermission("settings.manage");
  if ("error" in guard) return guard;

  const status = await getGatewayStatus();
  if (!status) return { success: true, data: { state: "offline" } };
  if (status.connected) {
    const local = status.phone ? jidToLocalPhone(`${status.phone}@s.whatsapp.net`) : null;
    return { success: true, data: { state: "connected", phone: local ?? (status.phone ? `+${status.phone}` : null), name: status.name } };
  }
  if (status.loggedOut) return { success: true, data: { state: "logged_out" } };
  if (!status.qr) return { success: true, data: { state: "starting" } };

  const qrDataUrl = await QRCode.toDataURL(status.qr, { margin: 1, width: 280, errorCorrectionLevel: "M" });
  return { success: true, data: { state: "qr", qrDataUrl } };
}

/** Unlink the current phone and start a fresh session (a new QR appears). */
export async function resetWhatsAppSessionAction(): Promise<ActionResult> {
  const guard = await guardPermission("settings.manage");
  if ("error" in guard) return guard;

  const ok = await resetGatewaySession();
  if (!ok) return { error: "The WhatsApp service isn't reachable. Make sure it's running." };
  await logActivity({ actorUserId: Number(guard.id), action: "whatsapp.relinked", entityType: "settings" });
  return { success: true };
}
