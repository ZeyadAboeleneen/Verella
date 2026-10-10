"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { EGYPT_GOVERNORATES, GATEWAY_PAYMENT_METHODS, type PaymentMethodCode } from "@verella/core";
import { updateSiteSettingsAction, type SiteSettingsInput } from "@/lib/settings/actions";
import { SITE_THEMES, THEME_LABELS, type SiteTheme } from "@/lib/settings/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, FormError } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

const METHOD_LABELS: Record<PaymentMethodCode, { name: string; hint: string }> = {
  cash_on_delivery: {
    name: "Cash on delivery",
    hint: "Customer pays the courier.",
  },
  instapay: {
    name: "InstaPay",
    hint: "Manual transfer — customer uploads a screenshot you approve under Payments.",
  },
  vodafone_cash: {
    name: "Vodafone Cash",
    hint: "Manual transfer — customer uploads a screenshot you approve under Payments.",
  },
  card: {
    name: "Credit / debit card",
    hint: "Needs the online payment gateway (e.g. Paymob) to be connected first.",
  },
  apple_pay: {
    name: "Apple Pay",
    hint: "Needs the online payment gateway (e.g. Paymob) to be connected first.",
  },
};

export function SettingsForm({ initial }: { initial: SiteSettingsInput }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fees, setFees] = useState<Record<string, string>>(Object.fromEntries(initial.governorateFees.map((g) => [g.name, g.fee])));
  const [methods, setMethods] = useState(initial.paymentMethods);
  const [theme, setTheme] = useState<SiteTheme>(initial.theme);
  const [marqueeEnabled, setMarqueeEnabled] = useState(initial.marqueeEnabled);
  const [aiBackgrounds, setAiBackgrounds] = useState(initial.aiBackgrounds);
  const [marquee, setMarquee] = useState(initial.marqueeItems.length ? initial.marqueeItems : [{ ar: "", en: "" }]);
  const setPhrase = (i: number, lang: "ar" | "en", v: string) =>
    setMarquee((prev) => prev.map((p, j) => (j === i ? { ...p, [lang]: v } : p)));
  const movePhrase = (i: number, by: -1 | 1) =>
    setMarquee((prev) => {
      const next = [...prev];
      const j = i + by;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const [depositType, setDepositType] = useState(initial.codDepositType);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await updateSiteSettingsAction({
      siteNameEn: String(formData.get("siteNameEn")),
      siteNameAr: String(formData.get("siteNameAr")),
      theme,
      currency: String(formData.get("currency")),
      deliveryFee: String(formData.get("deliveryFee")),
      freeShippingThreshold: String(formData.get("freeShippingThreshold") ?? ""),
      codDepositType: depositType,
      marqueeEnabled,
      aiBackgrounds,
      marqueeItems: marquee,
      codDepositValue: String(formData.get("codDepositValue") ?? ""),
      governorateFees: Object.entries(fees).map(([name, fee]) => ({
        name,
        fee,
      })),
      notificationEmail: String(formData.get("notificationEmail")),
      notificationWhatsApp: String(formData.get("notificationWhatsApp") ?? ""),
      taxEnabled: formData.get("taxEnabled") === "on",
      guestCheckoutEnabled: formData.get("guestCheckoutEnabled") === "on",
      pickupEnabled: formData.get("pickupEnabled") === "on",
      instapayNumber: String(formData.get("instapayNumber")),
      instapayName: String(formData.get("instapayName")),
      vodafoneCashNumber: String(formData.get("vodafoneCashNumber")),
      vodafoneCashName: String(formData.get("vodafoneCashName")),
      paymentMethods: methods,
    });
    setPending(false);
    if ("error" in res) {
      setError(res.error);
      toast(res.error, "error");
      return;
    }
    toast("Settings saved.");
    router.refresh();
  }

  function applyToAll(value: string) {
    setFees(Object.fromEntries(EGYPT_GOVERNORATES.map((g) => [g.name, value])));
  }

  return (
    <form action={onSubmit} className="max-w-3xl space-y-6">
      <FormError>{error}</FormError>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp new-order alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="sm:w-1/2 sm:pe-2">
            <Label htmlFor="notificationWhatsApp">New-order WhatsApp number</Label>
            <Input
              id="notificationWhatsApp"
              name="notificationWhatsApp"
              type="tel"
              dir="ltr"
              placeholder="01012345678"
              defaultValue={initial.notificationWhatsApp}
            />
            <p className="mt-1 text-xs text-on-surface-variant">
              Gets a WhatsApp message for every new website order. Leave empty to turn off.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-on-surface-variant">Only switched-on methods appear at checkout, in this order.</p>
          {methods.map((m) => {
            const gateway = GATEWAY_PAYMENT_METHODS.includes(m.code);
            return (
              <label
                key={m.code}
                className={`flex items-start gap-3 rounded-xl border border-outline-variant p-4 ${gateway ? "opacity-60" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-charcoal"
                  checked={m.isActive}
                  disabled={gateway}
                  onChange={(e) => setMethods((prev) => prev.map((x) => (x.code === m.code ? { ...x, isActive: e.target.checked } : x)))}
                />
                <span>
                  <span className="block text-sm font-medium text-on-surface">{METHOD_LABELS[m.code].name}</span>
                  <span className="mt-0.5 block text-xs text-on-surface-variant">{METHOD_LABELS[m.code].hint}</span>
                </span>
              </label>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cash on delivery deposit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-on-surface-variant">
            When on, cash on delivery orders stay pending and the customer gets a WhatsApp message asking for this deposit by InstaPay or
            Vodafone Cash (with the account details below) and a screenshot in the chat. Confirm the order yourself once it&apos;s paid —
            the full confirmation is sent then. The deposit is taken off the cash due on delivery.
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label htmlFor="codDepositType">Deposit</Label>
              <select
                id="codDepositType"
                value={depositType}
                onChange={(e) => setDepositType(e.target.value as typeof depositType)}
                className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-on-surface"
              >
                <option value="off">Off — no deposit</option>
                <option value="percent">Percentage of the order (without delivery)</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </div>
            {depositType !== "off" && (
              <div className="w-40">
                <Label htmlFor="codDepositValue">{depositType === "percent" ? "Percentage (%)" : "Amount (EGP)"}</Label>
                <Input
                  id="codDepositValue"
                  name="codDepositValue"
                  type="number"
                  step={depositType === "percent" ? "1" : "0.01"}
                  min="0"
                  max={depositType === "percent" ? "100" : undefined}
                  defaultValue={initial.codDepositValue}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wallet transfer details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-on-surface-variant">Shown at checkout so customers know where to send the transfer.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="instapayNumber">InstaPay number / handle</Label>
              <Input id="instapayNumber" name="instapayNumber" dir="ltr" placeholder="01012345678" defaultValue={initial.instapayNumber} />
            </div>
            <div>
              <Label htmlFor="instapayName">InstaPay account name</Label>
              <Input id="instapayName" name="instapayName" placeholder="Verella" defaultValue={initial.instapayName} />
            </div>
            <div>
              <Label htmlFor="vodafoneCashNumber">Vodafone Cash number</Label>
              <Input
                id="vodafoneCashNumber"
                name="vodafoneCashNumber"
                dir="ltr"
                placeholder="01012345678"
                defaultValue={initial.vodafoneCashNumber}
              />
            </div>
            <div>
              <Label htmlFor="vodafoneCashName">Vodafone Cash account name</Label>
              <Input id="vodafoneCashName" name="vodafoneCashName" placeholder="Verella" defaultValue={initial.vodafoneCashName} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-44">
              <Label htmlFor="deliveryFee">Default fee (EGP)</Label>
              <Input id="deliveryFee" name="deliveryFee" type="number" step="0.01" min="0" defaultValue={initial.deliveryFee} />
            </div>
            <p className="pb-3 text-xs text-on-surface-variant">Used for any governorate left blank below.</p>
          </div>

          <div className="flex flex-wrap items-end gap-4 rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
            <div className="w-44">
              <Label htmlFor="freeShippingThreshold">Free delivery from (EGP)</Label>
              <Input
                id="freeShippingThreshold"
                name="freeShippingThreshold"
                type="number"
                step="0.01"
                min="0"
                placeholder="Off"
                defaultValue={initial.freeShippingThreshold}
              />
            </div>
            <p className="pb-3 text-xs text-on-surface-variant">
              Orders of this amount or more (after discounts) get free delivery to any governorate. Leave empty to turn it off.
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="mb-0">Fee per governorate (EGP)</Label>
              <button
                type="button"
                className="text-xs text-on-surface-variant underline-offset-4 hover:text-on-surface hover:underline"
                onClick={() => {
                  const v = (document.getElementById("deliveryFee") as HTMLInputElement | null)?.value ?? "";
                  applyToAll(v);
                }}
              >
                Fill all with the default fee
              </button>
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {EGYPT_GOVERNORATES.map((g) => (
                <label key={g.name} className="flex items-center justify-between gap-3 border-b border-outline-variant/60 py-1.5">
                  <span className="text-sm text-on-surface">
                    {g.name} <span className="text-xs text-on-surface-variant">· {g.ar}</span>
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="default"
                    aria-label={`${g.name} delivery fee`}
                    value={fees[g.name] ?? ""}
                    onChange={(e) => setFees((prev) => ({ ...prev, [g.name]: e.target.value }))}
                    className="h-9 w-24 px-2"
                  />
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input type="checkbox" name="pickupEnabled" defaultChecked={initial.pickupEnabled} className="h-4 w-4 accent-charcoal" />
            Offer in-store pickup at checkout
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scrolling text strip</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              className="h-4 w-4 accent-charcoal"
              checked={marqueeEnabled}
              onChange={(e) => setMarqueeEnabled(e.target.checked)}
            />
            Show the strip (home, About and Store pages)
          </label>
          {marqueeEnabled && (
            <>
              <p className="text-xs text-on-surface-variant">
                Each row is one phrase between the V marks, in Arabic and English. Leave all rows empty to use the default text.
              </p>
              <div className="space-y-2">
                {marquee.map((p, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                    <Input
                      dir="rtl"
                      placeholder="بالعربي"
                      aria-label={`Phrase ${i + 1} in Arabic`}
                      value={p.ar}
                      onChange={(e) => setPhrase(i, "ar", e.target.value)}
                      className="min-w-0 flex-1"
                    />
                    <Input
                      placeholder="In English"
                      aria-label={`Phrase ${i + 1} in English`}
                      value={p.en}
                      onChange={(e) => setPhrase(i, "en", e.target.value)}
                      className="min-w-0 flex-1"
                    />
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => movePhrase(i, -1)}
                        disabled={i === 0}
                        aria-label="Move up"
                        className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhrase(i, 1)}
                        disabled={i === marquee.length - 1}
                        aria-label="Move down"
                        className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarquee((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : [{ ar: "", en: "" }]))}
                        aria-label="Remove phrase"
                        className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container hover:text-error"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setMarquee((prev) => [...prev, { ar: "", en: "" }])}
                disabled={marquee.length >= 20}
                className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container disabled:opacity-40"
              >
                <Plus size={13} /> Add phrase
              </button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI product backgrounds</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-2 text-sm text-on-surface">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-charcoal" checked={aiBackgrounds} onChange={(e) => setAiBackgrounds(e.target.checked)} />
            <span>
              Make AI styled backgrounds for product photos
              <span className="mt-0.5 block text-xs text-on-surface-variant">
                Off: no new AI photos are made for any product (existing ones stay). Each product also has its own switch. Turn this off if
                the server is short on memory.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-on-surface-variant">
            Colour theme for the footer, page banners and marquee. Classic matches the brand guidelines exactly; the others add an optional
            colour wash.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SITE_THEMES.map((t) => {
              const info = THEME_LABELS[t];
              const selected = theme === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  aria-pressed={selected}
                  className={`rounded-xl border p-3 text-start transition-colors ${
                    selected ? "border-charcoal ring-1 ring-charcoal" : "border-outline-variant hover:border-on-surface-variant"
                  }`}
                >
                  <span
                    className="block h-10 w-full rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, ${info.swatch[0]}, ${info.swatch[1]})`,
                    }}
                    aria-hidden="true"
                  />
                  <span className="mt-2 block text-sm font-medium text-on-surface">{info.name}</span>
                  <span className="mt-0.5 block text-xs text-on-surface-variant">{info.hint}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="siteNameEn">Site name (English)</Label>
              <Input id="siteNameEn" name="siteNameEn" defaultValue={initial.siteNameEn} />
            </div>
            <div>
              <Label htmlFor="siteNameAr">Site name (Arabic)</Label>
              <Input id="siteNameAr" name="siteNameAr" dir="rtl" defaultValue={initial.siteNameAr} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="currency">Currency code</Label>
              <Input id="currency" name="currency" defaultValue={initial.currency} maxLength={3} />
            </div>
            <div>
              <Label htmlFor="notificationEmail">Notification email</Label>
              <Input id="notificationEmail" name="notificationEmail" type="email" defaultValue={initial.notificationEmail} />
              <p className="mt-1 text-xs text-on-surface-variant">Receives new-order alerts and contact-form messages.</p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              name="guestCheckoutEnabled"
              defaultChecked={initial.guestCheckoutEnabled}
              className="h-4 w-4 accent-charcoal"
            />
            Allow checkout without an account
          </label>
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input type="checkbox" name="taxEnabled" defaultChecked={initial.taxEnabled} className="h-4 w-4 accent-charcoal" />
            Apply tax to orders
          </label>
        </CardContent>
      </Card>

      <Button type="submit" loading={pending}>
        Save settings
      </Button>
    </form>
  );
}
