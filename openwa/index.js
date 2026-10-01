/**
 * Verella WhatsApp gateway — Baileys, headless, no browser.
 *
 * Internal service. It does two things:
 *   1. POST /send  — the Next.js backend (apps/web/src/lib/whatsapp/service.ts)
 *      calls this to deliver order invoices. Bound to 127.0.0.1 only; never
 *      reachable from the browser or the internet.
 *   2. Incoming messages are forwarded to WEBHOOK_URL (kept for future use —
 *      Verella has no chatbot).
 *
 * Session files live in ./auth_info (gitignored). Delete that folder and
 * restart to link a different phone.
 */
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import axios from "axios";
import pino from "pino";
import qrcode from "qrcode-terminal";
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidGroup,
  isLidUser,
  jidDecode,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// openwa/.env first, then the repo-root .env (first file wins per variable).
dotenv.config({ path: [path.join(HERE, ".env"), path.join(HERE, "..", ".env")], quiet: true });
const AUTH_DIR = path.join(HERE, "auth_info");
const LID_MAP_FILE = path.join(AUTH_DIR, "lid_map.json");

const PORT = Number(process.env.OPENWA_PORT || 3001);
const HOST = process.env.OPENWA_HOST || "127.0.0.1";
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";
const WEBHOOK_SECRET = process.env.OPENWA_WEBHOOK_SECRET || "";

const log = pino({ level: process.env.LOG_LEVEL || "info" });
// Baileys is extremely chatty at info level; keep its own logs quiet.
const baileysLogger = pino({ level: "warn" });

let sock = null;
let connected = false;
let loggedOut = false;
let lastQrAt = null;
/** Latest pairing QR (raw string). Shown in Admin → Settings; null once linked. */
let currentQr = null;
/** Bumped on every (re)connect so a replaced socket's late events are ignored. */
let generation = 0;
let reconnectAttempts = 0;

// ── LID → phone map ─────────────────────────────────────────────────────
// WhatsApp increasingly addresses people by an opaque "@lid" id instead of
// their phone number. We keep our own lid → phone map so incoming messages
// can still be matched to a customer's phone.

/** @type {Record<string, string>} lid user part → phone digits (e.g. "201012345678") */
let lidMap = {};

function loadLidMap() {
  try {
    lidMap = JSON.parse(fs.readFileSync(LID_MAP_FILE, "utf8"));
  } catch {
    lidMap = {};
  }
}

function saveLidMap() {
  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    fs.writeFileSync(LID_MAP_FILE, JSON.stringify(lidMap, null, 2));
  } catch (err) {
    log.warn({ err: err.message }, "could not write lid_map.json");
  }
}

const userOf = (jid) => jidDecode(jid)?.user || null;

function rememberLid(lidJid, phoneJidOrDigits) {
  const lid = userOf(lidJid);
  const phone = String(phoneJidOrDigits || "").includes("@") ? userOf(phoneJidOrDigits) : String(phoneJidOrDigits || "");
  if (!lid || !phone || !/^\d{8,15}$/.test(phone)) return;
  if (lidMap[lid] === phone) return;
  lidMap[lid] = phone;
  saveLidMap();
}

/**
 * Best-effort startup inference: Baileys 7 persists its own mappings as
 * auth_info/lid-mapping-<lid>_reverse.json (content: the phone digits).
 */
function inferLidMapFromSession() {
  let added = 0;
  try {
    for (const file of fs.readdirSync(AUTH_DIR)) {
      const m = /^lid-mapping-(\d+)_reverse\.json$/.exec(file);
      if (!m) continue;
      try {
        const phone = JSON.parse(fs.readFileSync(path.join(AUTH_DIR, file), "utf8"));
        if (typeof phone === "string" && /^\d{8,15}$/.test(phone) && lidMap[m[1]] !== phone) {
          lidMap[m[1]] = phone;
          added++;
        }
      } catch {
        /* unreadable entry — skip */
      }
    }
  } catch {
    /* no session yet */
  }
  if (added) {
    saveLidMap();
    log.info({ added }, "inferred lid→phone mappings from session");
  }
}

function onContacts(contacts) {
  for (const c of contacts || []) {
    if (!c) continue;
    if (c.id && isLidUser(c.id) && c.phoneNumber) rememberLid(c.id, c.phoneNumber);
    if (c.lid && c.phoneNumber) rememberLid(c.lid, c.phoneNumber);
    if (c.lid && c.id && !isLidUser(c.id)) rememberLid(c.lid, c.id);
  }
}

/** Resolve any jid to a phone-number jid when we can; otherwise return it unchanged. */
async function resolveJid(rawJid, altJid) {
  if (!isLidUser(rawJid)) return rawJid;
  if (altJid && !isLidUser(altJid)) {
    rememberLid(rawJid, altJid);
    return `${userOf(altJid)}@s.whatsapp.net`;
  }
  const lid = userOf(rawJid);
  if (lid && lidMap[lid]) return `${lidMap[lid]}@s.whatsapp.net`;
  try {
    const pn = await sock?.signalRepository?.lidMapping?.getPNForLID(rawJid);
    if (pn) {
      rememberLid(rawJid, pn);
      return `${userOf(pn)}@s.whatsapp.net`;
    }
  } catch {
    /* unknown lid */
  }
  return rawJid;
}

/** 201012345678@s.whatsapp.net → 01012345678 (Egyptian local format). */
function toLocalPhone(jid) {
  const user = isLidUser(jid) ? null : userOf(jid);
  if (!user) return null;
  if (/^20\d{10}$/.test(user)) return `0${user.slice(2)}`;
  return user;
}

function extractText(message) {
  return (
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    ""
  ).trim();
}

async function forwardToWebhook(payload) {
  if (!WEBHOOK_URL) return;
  const body = JSON.stringify(payload);
  const headers = { "Content-Type": "application/json" };
  // Optional: only when a secret is configured. Baileys itself signs nothing;
  // this gateway signs its own requests so the webhook can verify them.
  if (WEBHOOK_SECRET) {
    headers["X-Openwa-Signature"] = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
  }
  try {
    await axios.post(WEBHOOK_URL, body, { headers, timeout: 10_000 });
  } catch (err) {
    log.warn({ err: err.message }, "webhook delivery failed");
  }
}

async function onMessages({ messages, type }) {
  if (type !== "notify") return;
  for (const msg of messages || []) {
    const rawJid = msg.key?.remoteJid;
    if (!rawJid || msg.key.fromMe) continue;
    if (isJidGroup(rawJid) || rawJid === "status@broadcast" || rawJid.endsWith("@newsletter")) continue;
    const text = extractText(msg.message);
    if (!text) continue;

    const from = await resolveJid(rawJid, msg.key.remoteJidAlt);
    const payload = { from, rawJid, phone: toLocalPhone(from), body: text, text };
    log.info({ rawJid, from }, "incoming message");
    await forwardToWebhook(payload);
  }
}

// ── Connection ──────────────────────────────────────────────────────────
async function connect() {
  const gen = ++generation;
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch {
    /* offline — Baileys falls back to its bundled version */
  }

  sock = makeWASocket({
    ...(version ? { version } : {}),
    auth: state,
    logger: baileysLogger,
    browser: Browsers.windows("Verella"),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("contacts.upsert", onContacts);
  sock.ev.on("contacts.update", onContacts);
  sock.ev.on("messages.upsert", (e) => onMessages(e).catch((err) => log.error({ err: err.message }, "message handler failed")));

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (gen !== generation) return; // a newer socket replaced this one (reset)
    if (qr) {
      currentQr = qr;
      lastQrAt = new Date().toISOString();
      console.log("\nScan this QR (terminal, or Admin → Settings → WhatsApp) with WhatsApp → Linked devices → Link a device:\n");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") {
      connected = true;
      loggedOut = false;
      currentQr = null;
      reconnectAttempts = 0;
      log.info({ user: sock.user?.id }, "WhatsApp connected");
      inferLidMapFromSession();
    }
    if (connection === "close") {
      connected = false;
      currentQr = null;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        loggedOut = true;
        log.error(
          "WhatsApp session LOGGED OUT. Not reconnecting. Link again from Admin → Settings → WhatsApp " +
            `(or stop this process, delete ${AUTH_DIR}, start it again and scan the new QR code).`,
        );
        return;
      }
      // restartRequired (515) is the normal step right after a QR scan.
      const delay = code === DisconnectReason.restartRequired ? 0 : Math.min(30_000, 2_000 * 2 ** reconnectAttempts++);
      log.warn({ code, retryInMs: delay }, "WhatsApp connection closed — reconnecting");
      setTimeout(() => {
        if (gen === generation) connect().catch((err) => log.error({ err: err.message }, "reconnect failed"));
      }, delay);
    }
  });
}

/**
 * Unlink the current phone (if any), wipe the saved session and start fresh,
 * so a new QR appears. Triggered from Admin → Settings → WhatsApp.
 */
async function resetSession() {
  const old = sock;
  generation++; // silence the old socket before it closes
  connected = false;
  currentQr = null;
  try {
    await old?.logout?.(); // removes "Verella" from the phone's Linked devices
  } catch {
    /* already logged out / offline — fine */
  }
  try {
    old?.end?.(undefined);
  } catch {
    /* ignore */
  }
  fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  lidMap = {};
  loggedOut = false;
  reconnectAttempts = 0;
  await connect();
}

// ── Internal HTTP API ───────────────────────────────────────────────────
function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("payload_too_large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleSend(req, res) {
  if (!connected || !sock) {
    return json(res, 503, { success: false, error: loggedOut ? "logged_out" : "not_connected" });
  }
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return json(res, 400, { success: false, error: "invalid_json" });
  }
  const jid = typeof payload?.jid === "string" ? payload.jid.trim() : "";
  const text = typeof payload?.text === "string" ? payload.text : "";
  if (!/^[\d]+@(s\.whatsapp\.net|lid)$/.test(jid)) return json(res, 400, { success: false, error: "invalid_jid" });
  if (!text.trim()) return json(res, 400, { success: false, error: "empty_text" });

  try {
    // Don't "send" into the void: phone jids must actually be on WhatsApp.
    if (jid.endsWith("@s.whatsapp.net")) {
      const [result] = (await sock.onWhatsApp(jid)) || [];
      if (!result?.exists) return json(res, 404, { success: false, error: "not_on_whatsapp", jid });
    }
    const sent = await sock.sendMessage(jid, { text });
    return json(res, 200, { success: true, jid, messageId: sent?.key?.id || null });
  } catch (err) {
    log.error({ err: err.message, jid }, "send failed");
    return json(res, 502, { success: false, error: "send_failed", detail: err.message });
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://local");
  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, {
      status: "ok",
      connected,
      loggedOut,
      user: sock?.user?.id || null,
      awaitingQrSince: connected ? null : lastQrAt,
    });
  }
  // Used by Admin → Settings → WhatsApp (via the app's server, never the browser).
  if (req.method === "GET" && url.pathname === "/status") {
    return json(res, 200, {
      connected,
      loggedOut,
      phone: connected ? jidDecode(sock?.user?.id)?.user || null : null,
      name: connected ? sock?.user?.name || null : null,
      qr: connected ? null : currentQr,
    });
  }
  if (req.method === "POST" && url.pathname === "/reset") {
    resetSession()
      .then(() => json(res, 200, { success: true }))
      .catch((err) => json(res, 500, { success: false, error: err.message }));
    return;
  }
  if (req.method === "POST" && url.pathname === "/send") {
    handleSend(req, res).catch((err) => json(res, 500, { success: false, error: err.message }));
    return;
  }
  json(res, 404, { success: false, error: "not_found" });
});

// Only connect to WhatsApp once we own the port. A second copy (e.g. the
// boot task plus a manual start) must NOT open a parallel connection with the
// same saved session — WhatsApp would kick the working one offline.
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    log.error(`Port ${PORT} is already in use - another gateway is probably running. Exiting without touching WhatsApp.`);
  } else {
    log.error({ err: err.message }, "HTTP server error");
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  log.info(`WhatsApp gateway listening on http://${HOST}:${PORT} (internal only)`);
  loadLidMap();
  inferLidMapFromSession();
  connect().catch((err) => {
    log.error({ err: err.message }, "failed to start WhatsApp connection");
    process.exitCode = 1;
  });
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    server.close();
    try {
      sock?.end?.(undefined);
    } catch {
      /* ignore */
    }
    process.exit(0);
  });
}
