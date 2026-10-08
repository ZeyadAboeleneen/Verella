/**
 * Branded HTML emails for customer order notifications — the same content as
 * the WhatsApp messages (see lib/whatsapp/invoice.ts), laid out for email.
 *
 * Email clients ignore most modern CSS, so: table layout, inline styles,
 * system fonts, no images (nothing to block), max 600px wide.
 */
import { formatMoney, governorateLabel, toCents } from "@verella/core";
import { isNotifiedStatus, paymentMethodLabel, type InvoiceData, type MessageLocale, type StatusMessageData } from "@/lib/whatsapp/invoice";

const C = {
  bg: "#F5F0E8", // ivory
  card: "#FFFFFF",
  ink: "#141414", // charcoal
  muted: "#6B645B",
  line: "#E7DECF",
  gold: "#A8813E",
  goldInk: "#7D5E28",
  soft: "#FAF7F2",
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (v: string, locale: MessageLocale) => formatMoney(toCents(v), "EGP", locale);

function frame(locale: MessageLocale, store: string, preheader: string, inner: string): string {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = locale === "ar" ? "right" : "left";
  const font = locale === "ar" ? "Tahoma,'Segoe UI',Arial,sans-serif" : "'Helvetica Neue',Helvetica,Arial,sans-serif";
  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(store)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${dir}" style="max-width:600px;font-family:${font};color:${C.ink};text-align:${align};">
  <tr><td align="center" style="padding:6px 0 22px;">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:6px;color:${C.ink};">VERELLA</div>
    <div style="width:36px;height:2px;background:${C.gold};margin:10px auto 0;"></div>
  </td></tr>
  <tr><td style="background:${C.card};border-radius:18px;padding:32px 28px;border:1px solid ${C.line};">
    ${inner}
  </td></tr>
  <tr><td align="center" style="padding:22px 10px 8px;font-size:12px;line-height:1.7;color:${C.muted};">
    ${locale === "ar" ? `وصلك الإيميل ده لأنك طلبت من ${esc(store)}.` : `You received this email because you ordered from ${esc(store)}.`}
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

const button = (href: string, label: string, dark = true) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0;"><tr><td style="border-radius:999px;background:${dark ? C.ink : C.gold};">
<a href="${esc(href)}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:999px;">${esc(label)}</a>
</td></tr></table>`;

const heading = (text: string) => `<h1 style="margin:0 0 6px;font-size:24px;line-height:1.35;font-weight:bold;color:${C.ink};">${esc(text)}</h1>`;
const para = (html: string, style = "") => `<p style="margin:0 0 14px;font-size:15px;line-height:1.75;color:${C.ink};${style}">${html}</p>`;
const label = (text: string) =>
  `<div style="margin:24px 0 10px;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${C.goldInk};">${esc(text)}</div>`;

/** The "create your password" card — same rules as WhatsApp: only when the account has no password yet. */
function accountCard(d: InvoiceData, locale: MessageLocale): string {
  if (!d.accountSetupUrl) return "";
  const T =
    locale === "ar"
      ? {
          title: "طلبك اتحفظ في حساب باسمك 👤",
          body: "اعمل كلمة المرور بتاعتك، وبعدها تقدر تتابع طلباتك وتشوف القديمة كمان.",
          login: "هتسجّل دخول بـ",
          cta: "اعمل كلمة المرور",
          note: "اللينك يشتغل مرة واحدة وصالح لمدة 30 يوم.",
        }
      : {
          title: "Your order is saved to an account in your name 👤",
          body: "Create your password to follow your orders and see your past ones too.",
          login: "You'll sign in with",
          cta: "Create my password",
          note: "The link works once and is valid for 30 days.",
        };
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;background:${C.soft};border:1px solid ${C.line};border-radius:14px;">
<tr><td style="padding:20px 20px 16px;">
  <div style="font-size:16px;font-weight:bold;margin-bottom:6px;">${esc(T.title)}</div>
  <div style="font-size:14px;line-height:1.7;color:${C.muted};margin-bottom:10px;">${esc(T.body)}</div>
  ${d.accountLogin ? `<div style="font-size:14px;margin-bottom:12px;">${esc(T.login)}: <strong dir="ltr">${esc(d.accountLogin)}</strong></div>` : ""}
  ${button(d.accountSetupUrl, T.cta, false)}
  <div style="font-size:12px;color:${C.muted};margin-top:8px;">${esc(T.note)}</div>
</td></tr></table>`;
}

/** Order confirmation email. */
export function renderOrderConfirmationEmail(d: InvoiceData): { subject: string; html: string } {
  const locale = d.locale ?? "ar";
  const store = d.storeName ?? (locale === "ar" ? "ڤيريلا" : "Verella");
  const m = (v: string) => money(v, locale);
  const isCod = d.paymentMethodCode === "cash_on_delivery";
  const end = locale === "ar" ? "left" : "right";
  const T =
    locale === "ar"
      ? {
          subject: `تم تأكيد طلبك #${d.orderNumber}`,
          title: "تم تأكيد طلبك ❤️",
          hello: (n: string) => `أهلاً ${n}،`,
          intro: "شكراً لطلبك! ده ملخص طلبك.",
          orderNo: "رقم الطلب",
          items: "المنتجات",
          subtotal: "المجموع الفرعي",
          discount: "الخصم",
          delivery: "التوصيل",
          free: "مجاناً",
          total: "الإجمالي",
          payment: "طريقة الدفع",
          due: "المطلوب عند الاستلام",
          paid: "تم استلام الدفع ✅",
          address: "عنوان التوصيل",
          pickup: "الاستلام من الفرع",
          track: "تابع طلبك",
          thanks: `شكراً لطلبك من ${store} ❤️`,
        }
      : {
          subject: `Order confirmed #${d.orderNumber}`,
          title: "Your order is confirmed ❤️",
          hello: (n: string) => `Hi ${n},`,
          intro: "Thank you for your order! Here's your summary.",
          orderNo: "Order number",
          items: "Items",
          subtotal: "Subtotal",
          discount: "Discount",
          delivery: "Delivery",
          free: "Free",
          total: "Total",
          payment: "Payment",
          due: "Due on delivery",
          paid: "Payment received ✅",
          address: "Delivery address",
          pickup: "Pickup from the store",
          track: "Track your order",
          thanks: `Thank you for ordering from ${store} ❤️`,
        };

  const row = (k: string, v: string, strong = false) =>
    `<tr><td style="padding:5px 0;font-size:14px;color:${strong ? C.ink : C.muted};${strong ? "font-weight:bold;font-size:16px;" : ""}">${esc(k)}</td>
<td style="padding:5px 0;font-size:14px;text-align:${end};white-space:nowrap;${strong ? "font-weight:bold;font-size:16px;" : ""}">${esc(v)}</td></tr>`;

  const items = d.items
    .map(
      (i) => `<tr>
<td style="padding:12px 0;border-bottom:1px solid ${C.line};font-size:14px;line-height:1.5;">
  <div style="font-weight:bold;">${esc(i.name)}</div>
  <div style="color:${C.muted};font-size:13px;">${i.variant ? `${esc(i.variant)} · ` : ""}× ${i.quantity}</div>
</td>
<td style="padding:12px 0;border-bottom:1px solid ${C.line};font-size:14px;text-align:${end};white-space:nowrap;vertical-align:top;">${esc(m(i.lineTotal))}</td>
</tr>`,
    )
    .join("");

  const a = d.address;
  const addressHtml =
    d.fulfillmentType === "pickup"
      ? `${label(T.pickup)}`
      : a
        ? `${label(T.address)}<div style="font-size:14px;line-height:1.7;">${[
            [a.street, a.building, a.floor, a.apartment].filter(Boolean).map((x) => esc(String(x))).join(locale === "ar" ? "، " : ", "),
            [a.area, a.city, governorateLabel(a.governorate, locale)].filter(Boolean).map((x) => esc(String(x))).join(locale === "ar" ? "، " : ", "),
            a.landmark ? esc(a.landmark) : "",
          ]
            .filter(Boolean)
            .join("<br>")}</div>`
        : "";

  const inner = `
${heading(T.title)}
${para(`${d.customerName?.trim() ? `${esc(T.hello(d.customerName.trim()))} ` : ""}${esc(T.intro)}`, `color:${C.muted};`)}
<div style="display:inline-block;margin:4px 0 6px;padding:7px 14px;border-radius:999px;background:${C.soft};border:1px solid ${C.line};font-size:13px;">${esc(T.orderNo)}: <strong dir="ltr">#${esc(d.orderNumber)}</strong></div>
${label(T.items)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
  ${row(T.subtotal, m(d.subtotal))}
  ${Number(d.discountTotal) > 0 ? row(T.discount, `−${m(d.discountTotal)}`) : ""}
  ${d.fulfillmentType === "delivery" ? row(T.delivery, Number(d.deliveryFee) === 0 ? T.free : m(d.deliveryFee)) : ""}
  <tr><td colspan="2" style="padding-top:6px;border-top:1px solid ${C.line};"></td></tr>
  ${row(T.total, m(d.grandTotal), true)}
</table>
${label(T.payment)}
<div style="font-size:14px;line-height:1.7;">${esc(paymentMethodLabel(d.paymentMethodCode, locale))}<br>
<span style="color:${isCod ? C.goldInk : "#2E7D4F"};font-weight:bold;">${esc(isCod ? `${T.due}: ${m(d.grandTotal)}` : T.paid)}</span></div>
${addressHtml}
${d.trackingUrl ? `<div style="margin-top:26px;">${button(d.trackingUrl, T.track)}</div>` : ""}
${accountCard(d, locale)}
${para(esc(T.thanks), "margin:26px 0 0;")}
`;
  return { subject: T.subject, html: frame(locale, store, T.intro, inner) };
}

export interface AdminNewOrderEmailData {
  orderNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  fulfillmentType: "delivery" | "pickup";
  items: InvoiceData["items"];
  subtotal: string;
  discountTotal: string;
  deliveryFee: string;
  grandTotal: string;
  paymentMethodCode: string;
  /** One-line delivery address, if delivery. */
  address: string | null;
  /** Language the customer ordered in. */
  customerLocale: MessageLocale;
  adminUrl: string;
}

/** Store-owner alert for a new website order (English, like the dashboard). */
export function renderAdminNewOrderEmail(d: AdminNewOrderEmailData): { subject: string; html: string; text: string } {
  const m = (v: string) => money(v, "en");
  const isCod = d.paymentMethodCode === "cash_on_delivery";
  const subject = `🛍️ New order #${d.orderNumber} — ${m(d.grandTotal)}`;

  const kv = (k: string, v: string | null) =>
    v ? `<tr><td style="padding:4px 0;font-size:13px;color:${C.muted};width:110px;vertical-align:top;">${esc(k)}</td><td style="padding:4px 0;font-size:14px;">${esc(v)}</td></tr>` : "";
  const row = (k: string, v: string, strong = false) =>
    `<tr><td style="padding:5px 0;font-size:14px;color:${strong ? C.ink : C.muted};${strong ? "font-weight:bold;font-size:16px;" : ""}">${esc(k)}</td>
<td style="padding:5px 0;font-size:14px;text-align:right;white-space:nowrap;${strong ? "font-weight:bold;font-size:16px;" : ""}">${esc(v)}</td></tr>`;
  const items = d.items
    .map(
      (i) => `<tr>
<td style="padding:10px 0;border-bottom:1px solid ${C.line};font-size:14px;line-height:1.5;"><div style="font-weight:bold;">${esc(i.name)}</div>
<div style="color:${C.muted};font-size:13px;">${i.variant ? `${esc(i.variant)} · ` : ""}× ${i.quantity}</div></td>
<td style="padding:10px 0;border-bottom:1px solid ${C.line};font-size:14px;text-align:right;white-space:nowrap;vertical-align:top;">${esc(m(i.lineTotal))}</td></tr>`,
    )
    .join("");

  const badge = (text: string, bg: string, color: string) =>
    `<span style="display:inline-block;padding:5px 12px;margin:0 6px 6px 0;border-radius:999px;background:${bg};color:${color};font-size:12px;font-weight:bold;">${esc(text)}</span>`;

  const inner = `
<div style="font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${C.goldInk};margin-bottom:8px;">New website order</div>
${heading(`#${d.orderNumber}`)}
<div style="font-size:28px;font-weight:bold;margin:2px 0 14px;">${esc(m(d.grandTotal))}</div>
<div>
  ${badge(d.fulfillmentType === "pickup" ? "Pickup" : "Delivery", C.soft, C.ink)}
  ${badge(paymentMethodLabel(d.paymentMethodCode, "en"), isCod ? "#FFF4DE" : "#E6F4EC", isCod ? C.goldInk : "#2E7D4F")}
  ${isCod ? "" : badge("Transfer to review", "#FDECEC", "#A23B3B")}
  ${badge(d.customerLocale === "ar" ? "Arabic site" : "English site", C.soft, C.muted)}
</div>
${label("Customer")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  ${kv("Name", d.customerName)}
  ${kv("Mobile", d.customerPhone)}
  ${kv("Email", d.customerEmail)}
  ${kv(d.fulfillmentType === "pickup" ? "Fulfilment" : "Address", d.fulfillmentType === "pickup" ? "Pickup from the store" : d.address)}
</table>
${label("Items")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
  ${row("Subtotal", m(d.subtotal))}
  ${Number(d.discountTotal) > 0 ? row("Discount", `−${m(d.discountTotal)}`) : ""}
  ${d.fulfillmentType === "delivery" ? row("Delivery", Number(d.deliveryFee) === 0 ? "Free" : m(d.deliveryFee)) : ""}
  <tr><td colspan="2" style="padding-top:6px;border-top:1px solid ${C.line};"></td></tr>
  ${row("Total", m(d.grandTotal), true)}
</table>
<div style="margin-top:26px;">${button(d.adminUrl, "Open order in dashboard")}</div>
`;

  const text = [
    `New website order #${d.orderNumber} — ${m(d.grandTotal)}`,
    `${d.fulfillmentType === "pickup" ? "Pickup" : "Delivery"} · ${paymentMethodLabel(d.paymentMethodCode, "en")}${isCod ? "" : " (transfer to review)"}`,
    "",
    ...[d.customerName, d.customerPhone, d.customerEmail, d.address].filter(Boolean),
    "",
    ...d.items.map((i) => `- ${i.name}${i.variant ? ` (${i.variant})` : ""} × ${i.quantity} — ${m(i.lineTotal)}`),
    "",
    `Total: ${m(d.grandTotal)}`,
    `Open: ${d.adminUrl}`,
  ].join("\n");

  return { subject, html: frame("en", "Verella", `New order #${d.orderNumber} — ${m(d.grandTotal)}`, inner).replace(/You received this email because you ordered from Verella\./, "Admin alert · set the address in Admin → Settings."), text };
}

/** Order status-update email, or null for statuses that don't notify the customer. */
export function renderOrderStatusEmail(d: StatusMessageData): { subject: string; html: string } | null {
  if (!isNotifiedStatus(d.status)) return null;
  const locale = d.locale ?? "ar";
  const store = d.storeName ?? (locale === "ar" ? "ڤيريلا" : "Verella");
  const isCod = d.paymentMethodCode === "cash_on_delivery";
  const pickup = d.fulfillmentType === "pickup";
  const due = money(d.grandTotal, locale);

  const S =
    locale === "ar"
      ? {
          subject: `تحديث على طلبك #${d.orderNumber}`,
          hello: (n: string) => `أهلاً ${n}،`,
          track: "تابع طلبك",
          orderNo: "رقم الطلب",
          preparing: { icon: "📦", title: "طلبك بيتجهز", body: "بنجهّز طلبك دلوقتي، وهنبلغك أول ما يخرج." },
          out_for_delivery: { icon: "🚚", title: "طلبك خرج للتوصيل", body: "المندوب هيتواصل معاك قريب." + (isCod ? ` المطلوب عند الاستلام: ${due}` : "") },
          ready_for_pickup: { icon: "✅", title: "طلبك جاهز للاستلام", body: "تقدر تستلم طلبك من الفرع في أي وقت." },
          completed: pickup
            ? { icon: "✅", title: "تم استلام طلبك", body: "شكراً إنك اخترتنا!" }
            : { icon: "✅", title: "تم توصيل طلبك", body: "نتمنى المنتجات تعجبك ❤️" },
          cancelled: { icon: "✖️", title: "تم إلغاء طلبك", body: "لو عندك أي استفسار، رد على الإيميل ده." },
        }
      : {
          subject: `Update on your order #${d.orderNumber}`,
          hello: (n: string) => `Hi ${n},`,
          track: "Track your order",
          orderNo: "Order number",
          preparing: { icon: "📦", title: "Your order is being prepared", body: "We're getting your order ready and will let you know when it's on its way." },
          out_for_delivery: { icon: "🚚", title: "Your order is out for delivery", body: "The courier will contact you soon." + (isCod ? ` Amount due on delivery: ${due}` : "") },
          ready_for_pickup: { icon: "✅", title: "Your order is ready for pickup", body: "You can pick it up from the store any time." },
          completed: pickup
            ? { icon: "✅", title: "Your order has been picked up", body: "Thank you for choosing us!" }
            : { icon: "✅", title: "Your order has been delivered", body: "We hope you love it ❤️" },
          cancelled: { icon: "✖️", title: "Your order has been cancelled", body: "If you have any questions, just reply to this email." },
        };
  const s = S[d.status];

  const inner = `
<div style="font-size:40px;line-height:1;margin-bottom:14px;">${s.icon}</div>
${heading(s.title)}
${d.customerName?.trim() ? para(esc(S.hello(d.customerName.trim())), `color:${C.muted};margin-bottom:4px;`) : ""}
${para(esc(s.body), `color:${C.muted};`)}
<div style="display:inline-block;margin:4px 0 6px;padding:7px 14px;border-radius:999px;background:${C.soft};border:1px solid ${C.line};font-size:13px;">${esc(S.orderNo)}: <strong dir="ltr">#${esc(d.orderNumber)}</strong></div>
${d.trackingUrl && d.status !== "cancelled" && d.status !== "completed" ? `<div style="margin-top:22px;">${button(d.trackingUrl, S.track)}</div>` : ""}
${para(`${esc(store)} ❤️`, "margin:24px 0 0;")}
`;
  return { subject: S.subject, html: frame(locale, store, s.title, inner) };
}
