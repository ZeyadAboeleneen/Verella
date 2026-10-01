/**
 * Writes sample customer order emails to HTML files so they can be opened in
 * a browser. Offline — sends nothing.
 *   pnpm --filter @verella/web exec tsx scripts/preview-order-emails.ts <outDir>
 */
import fs from "node:fs";
import path from "node:path";
import { renderAdminNewOrderEmail, renderOrderConfirmationEmail, renderOrderStatusEmail } from "../src/lib/email/order-templates";
import type { InvoiceData } from "../src/lib/whatsapp/invoice";

const out = process.argv[2] ?? "email-previews";
fs.mkdirSync(out, { recursive: true });

const order: InvoiceData = {
  orderNumber: "VR-261001-BF7112A8",
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
  paymentMethodCode: "cash_on_delivery",
  address: { street: "شارع مكرم عبيد", building: "12", floor: "3", apartment: "7", area: "مدينة نصر", governorate: "Cairo" },
  trackingUrl: "https://verella.com/ar/order/VR-261001-BF7112A8",
  accountSetupUrl: "https://verella.com/ar/reset-password?token=sample&setup=1",
  accountLogin: "sara@example.com",
};

const files: [string, string][] = [
  ["confirmation-ar.html", renderOrderConfirmationEmail(order).html],
  [
    "confirmation-en.html",
    renderOrderConfirmationEmail({ ...order, customerName: "Sara", locale: "en", trackingUrl: order.trackingUrl!.replace("/ar/", "/en/"), accountSetupUrl: null }).html,
  ],
  [
    "status-ar.html",
    renderOrderStatusEmail({ orderNumber: order.orderNumber, status: "out_for_delivery", fulfillmentType: "delivery", paymentMethodCode: "cash_on_delivery", grandTotal: "4415.00", customerName: "سارة", trackingUrl: order.trackingUrl })!.html,
  ],
];
for (const [name, html] of files) fs.writeFileSync(path.join(out, name), html);
console.log(`Wrote ${files.length} previews to ${path.resolve(out)}`);

// Store-owner alert.
fs.writeFileSync(
  path.join(out, "admin-new-order.html"),
  renderAdminNewOrderEmail({
    orderNumber: order.orderNumber,
    customerName: "سارة أحمد",
    customerPhone: "01012345678",
    customerEmail: "sara@example.com",
    fulfillmentType: "delivery",
    items: order.items,
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    deliveryFee: order.deliveryFee,
    grandTotal: order.grandTotal,
    paymentMethodCode: "instapay",
    address: "شارع مكرم عبيد, Bldg 12, Floor 3, Apt 7, مدينة نصر, Cairo",
    customerLocale: "ar",
    adminUrl: "https://verella.com/admin/orders/15",
  }).html,
);
console.log("Wrote admin-new-order.html");
