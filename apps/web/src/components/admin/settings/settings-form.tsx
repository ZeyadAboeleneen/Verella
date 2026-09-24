"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EGYPT_GOVERNORATES, GATEWAY_PAYMENT_METHODS, type PaymentMethodCode } from "@verella/core";
import { updateSiteSettingsAction, type SiteSettingsInput } from "@/lib/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, FormError } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

const METHOD_LABELS: Record<PaymentMethodCode, { name: string; hint: string }> = {
  cash_on_delivery: { name: "Cash on delivery", hint: "Customer pays the courier." },
  instapay: { name: "InstaPay", hint: "Manual transfer — customer uploads a screenshot you approve under Payments." },
  vodafone_cash: { name: "Vodafone Cash", hint: "Manual transfer — customer uploads a screenshot you approve under Payments." },
  card: { name: "Credit / debit card", hint: "Needs the online payment gateway (e.g. Paymob) to be connected first." },
  apple_pay: { name: "Apple Pay", hint: "Needs the online payment gateway (e.g. Paymob) to be connected first." },
};

export function SettingsForm({ initial }: { initial: SiteSettingsInput }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fees, setFees] = useState<Record<string, string>>(
    Object.fromEntries(initial.governorateFees.map((g) => [g.name, g.fee])),
  );
  const [methods, setMethods] = useState(initial.paymentMethods);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await updateSiteSettingsAction({
      siteNameEn: String(formData.get("siteNameEn")),
      siteNameAr: String(formData.get("siteNameAr")),
      currency: String(formData.get("currency")),
      deliveryFee: String(formData.get("deliveryFee")),
      governorateFees: Object.entries(fees).map(([name, fee]) => ({ name, fee })),
      notificationEmail: String(formData.get("notificationEmail")),
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
                  onChange={(e) =>
                    setMethods((prev) => prev.map((x) => (x.code === m.code ? { ...x, isActive: e.target.checked } : x)))
                  }
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
              <Input id="vodafoneCashNumber" name="vodafoneCashNumber" dir="ltr" placeholder="01012345678" defaultValue={initial.vodafoneCashNumber} />
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
            <input type="checkbox" name="guestCheckoutEnabled" defaultChecked={initial.guestCheckoutEnabled} className="h-4 w-4 accent-charcoal" />
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
