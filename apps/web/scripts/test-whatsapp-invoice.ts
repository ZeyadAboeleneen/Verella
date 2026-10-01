/**
 * Offline test for the automatic WhatsApp order invoice.
 *
 * No network, no database, no Baileys, no Next.js server: sample orders are
 * fed straight into the same eligibility rules and message builder that
 * production uses (src/lib/whatsapp/invoice.ts + phone.ts).
 *
 *   pnpm --filter @verella/web whatsapp:test-invoice
 */
import assert from "node:assert/strict";
import {
  buildAccountCredentialsMessage,
  buildAdminNewOrderMessage,
  buildOrderInvoiceMessage,
  buildOrderStatusMessage,
  checkInvoiceEligibility,
  type InvoiceData,
  type InvoiceEligibilityInput,
} from "../src/lib/whatsapp/invoice";
import { jidToLocalPhone, toWhatsAppId } from "../src/lib/whatsapp/phone";

// Belt and braces: any attempt to reach the network fails the test loudly.
globalThis.fetch = (() => {
  throw new Error("Network call attempted — this test must stay offline.");
}) as typeof fetch;

const baseOrder: Omit<InvoiceData, "orderNumber" | "paymentMethodCode"> = {
  customerName: "سارة أحمد",
  fulfillmentType: "delivery",
  items: [
    { name: "Special Musk", variant: "75ml", quantity: 2, lineTotal: "2900.00" },
    { name: "Pink Diamond Sakura", variant: "150ml", quantity: 1, lineTotal: "1950.00" },
  ],
  subtotal: "4850.00",
  discountTotal: "485.00",
  deliveryFee: "50.00",
  grandTotal: "4415.00",
  address: { street: "شارع مكرم عبيد", building: "12", floor: "3", apartment: "7", area: "مدينة نصر", governorate: "Cairo" },
  trackingUrl: "https://verella.com/ar/order/VR-TEST",
};

let passed = 0;
function scenario(
  title: string,
  eligibility: InvoiceEligibilityInput,
  expected: { eligible: true } | { eligible: false; reason: string },
  invoice?: InvoiceData,
) {
  const result = checkInvoiceEligibility(eligibility);
  console.log(`\n━━ ${title}`);
  console.log(`   eligible = ${result.eligible}${result.eligible ? "" : `   reason = ${result.reason}`}`);
  assert.deepEqual(result, expected, `${title}: unexpected eligibility`);

  if (result.eligible) {
    assert.ok(invoice, `${title}: eligible scenario needs invoice data`);
    const jid = toWhatsAppId(eligibility.phone);
    console.log(`   send to: ${jid}`);
    console.log("   ┌──── message ────");
    console.log(buildOrderInvoiceMessage(invoice).replace(/^/gm, "   │ "));
    console.log("   └─────────────────");
  } else {
    console.log("   (nothing generated or sent)");
  }
  passed++;
}

scenario(
  "Test 1 — Order #1001, cash on delivery, just placed",
  { orderStatus: "pending", paymentMethodCode: "cash_on_delivery", paymentStatus: "pending", phone: "01012345678", invoiceStatus: null },
  { eligible: true },
  { ...baseOrder, orderNumber: "1001", paymentMethodCode: "cash_on_delivery" },
);

scenario(
  "Test 2 — Order #1002, InstaPay, payment still pending review",
  { orderStatus: "pending", paymentMethodCode: "instapay", paymentStatus: "submitted", phone: "01012345678", invoiceStatus: null },
  { eligible: false, reason: "payment_not_confirmed" },
);

scenario(
  "Test 3 — Order #1003, InstaPay, payment approved + order confirmed",
  { orderStatus: "confirmed", paymentMethodCode: "instapay", paymentStatus: "approved", phone: "+20 111 234 5678", invoiceStatus: null },
  { eligible: true },
  { ...baseOrder, orderNumber: "1003", paymentMethodCode: "instapay" },
);

scenario(
  "Test 4 — Order #1004, Vodafone Cash, payment approved + order confirmed (pickup)",
  { orderStatus: "confirmed", paymentMethodCode: "vodafone_cash", paymentStatus: "approved", phone: "٠١٢٣٤٥٦٧٨٩٠", invoiceStatus: null },
  { eligible: true },
  { ...baseOrder, orderNumber: "1004", paymentMethodCode: "vodafone_cash", fulfillmentType: "pickup", deliveryFee: "0.00", address: null, discountTotal: "0.00", grandTotal: "4850.00" },
);

scenario(
  "Test 5 — Order #1005, invoice already sent (duplicate trigger)",
  { orderStatus: "confirmed", paymentMethodCode: "cash_on_delivery", paymentStatus: "pending", phone: "01012345678", invoiceStatus: "sent" },
  { eligible: false, reason: "already_sent" },
);

scenario(
  "Test 6 — Order #1006, invalid phone number",
  { orderStatus: "pending", paymentMethodCode: "cash_on_delivery", paymentStatus: "pending", phone: "12345", invoiceStatus: null },
  { eligible: false, reason: "invalid_phone" },
);

scenario(
  "Extra — cancelled COD order",
  { orderStatus: "cancelled", paymentMethodCode: "cash_on_delivery", paymentStatus: "pending", phone: "01012345678", invoiceStatus: null },
  { eligible: false, reason: "order_cancelled" },
);

scenario(
  "Extra — Vodafone Cash approved but order was rejected back to pending",
  { orderStatus: "pending", paymentMethodCode: "vodafone_cash", paymentStatus: "approved", phone: "01012345678", invoiceStatus: null },
  { eligible: false, reason: "payment_not_confirmed" },
);

scenario(
  "Extra — previous attempt failed (retry allowed)",
  { orderStatus: "confirmed", paymentMethodCode: "cash_on_delivery", paymentStatus: "pending", phone: "01012345678", invoiceStatus: "failed" },
  { eligible: true },
  { ...baseOrder, orderNumber: "1009", paymentMethodCode: "cash_on_delivery" },
);

// Status-update messages (sent on admin status changes, after the invoice).
console.log("\n━━ Status updates");
for (const [status, fulfillmentType, method] of [
  ["preparing", "delivery", "cash_on_delivery"],
  ["out_for_delivery", "delivery", "cash_on_delivery"],
  ["out_for_delivery", "delivery", "instapay"],
  ["ready_for_pickup", "pickup", "vodafone_cash"],
  ["completed", "delivery", "cash_on_delivery"],
  ["completed", "pickup", "instapay"],
  ["cancelled", "delivery", "cash_on_delivery"],
] as const) {
  const msg = buildOrderStatusMessage({
    orderNumber: "VR-TEST",
    status,
    fulfillmentType,
    paymentMethodCode: method,
    grandTotal: "1480.00",
    customerName: "سارة",
    trackingUrl: "https://verella.com/ar/order/VR-TEST",
  });
  assert.ok(msg, `${status} should produce a message`);
  assert.equal(msg.includes("المطلوب عند الاستلام"), status === "out_for_delivery" && method === "cash_on_delivery", `${status}/${method}: COD amount line`);
  console.log(`\n   [${status} · ${fulfillmentType} · ${method}]`);
  console.log(msg.replace(/^/gm, "   │ "));
}
for (const quiet of ["pending", "confirmed"] as const) {
  assert.equal(
    buildOrderStatusMessage({ orderNumber: "X", status: quiet, fulfillmentType: "delivery", paymentMethodCode: "cash_on_delivery", grandTotal: "1" }),
    null,
    `${quiet} must not send an update`,
  );
}
console.log("\n   pending / confirmed → no update (the invoice covers confirmation)");
passed++;

// Store-owner new-order alert.
for (const method of ["cash_on_delivery", "instapay"]) {
  const msg = buildAdminNewOrderMessage({
    orderNumber: "VR-TEST",
    customerName: "سارة أحمد",
    customerPhone: "01012345678",
    fulfillmentType: "delivery",
    items: baseOrder.items,
    grandTotal: "4415.00",
    paymentMethodCode: method,
    governorate: "Cairo",
    area: "مدينة نصر",
    adminUrl: "https://verella.com/admin/orders/1",
  });
  console.log(`\n━━ Admin new-order alert · ${method}`);
  console.log(msg.replace(/^/gm, "   │ "));
  assert.ok(msg.includes("طلب جديد") && msg.includes("#VR-TEST") && msg.includes("/admin/orders/1"));
  assert.equal(msg.includes("بانتظار مراجعة التحويل"), method === "instapay");
}
passed++;

// New-account login details.
{
  const msg = buildAccountCredentialsMessage({
    login: "01012345678",
    password: "Kp7mQx2aRt",
    loginUrl: "https://verella.com/ar/login",
    customerName: "سارة أحمد",
  });
  console.log("\n━━ Account login details");
  console.log(msg.replace(/^/gm, "   │ "));
  assert.ok(msg.includes("01012345678") && msg.includes("Kp7mQx2aRt") && msg.includes("/ar/login"));
  passed++;
}

// Phone ⇄ JID conversions.
console.log("\n━━ Phone / JID conversions");
const phoneCases: [string, string | null][] = [
  ["01012345678", "201012345678@s.whatsapp.net"],
  ["010 1234 5678", "201012345678@s.whatsapp.net"],
  ["+201012345678", "201012345678@s.whatsapp.net"],
  ["00201512345678", "201512345678@s.whatsapp.net"],
  ["1112345678", "201112345678@s.whatsapp.net"],
  ["201012345678@s.whatsapp.net", "201012345678@s.whatsapp.net"], // jid → unchanged
  ["123456789@lid", "123456789@lid"], // lid jid → unchanged
  ["0223456789", null], // Cairo landline — not WhatsApp
  ["01312345678", null], // no such operator prefix
  ["12345", null],
];
for (const [input, expected] of phoneCases) {
  assert.equal(toWhatsAppId(input), expected, `toWhatsAppId(${input})`);
  console.log(`   ${input.padEnd(30)} → ${expected}`);
}
assert.equal(jidToLocalPhone("201012345678@s.whatsapp.net"), "01012345678");
assert.equal(jidToLocalPhone("123456789@lid"), null);
passed++;

console.log(`\n✔ All ${passed} checks passed — no network calls were made.`);
