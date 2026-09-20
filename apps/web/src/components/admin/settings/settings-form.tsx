"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { updateSiteSettingsAction, type SiteSettingsInput, type GovernorateFee } from "@/lib/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, FormError } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

export function SettingsForm({ initial }: { initial: SiteSettingsInput }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fees, setFees] = useState<GovernorateFee[]>(initial.governorateFees);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await updateSiteSettingsAction({
      siteNameEn: String(formData.get("siteNameEn")),
      siteNameAr: String(formData.get("siteNameAr")),
      currency: String(formData.get("currency")),
      deliveryFee: String(formData.get("deliveryFee")),
      governorateFees: fees,
      notificationEmail: String(formData.get("notificationEmail")),
      taxEnabled: formData.get("taxEnabled") === "on",
      guestCheckoutEnabled: formData.get("guestCheckoutEnabled") === "on",
      instapayNumber: String(formData.get("instapayNumber")),
      instapayName: String(formData.get("instapayName")),
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

  function setFee(index: number, patch: Partial<GovernorateFee>) {
    setFees((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  return (
    <form action={onSubmit} className="max-w-3xl space-y-6">
      <FormError>{error}</FormError>

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
              <p className="mt-1 text-xs text-on-surface-variant">
                Receives contact-form messages and admin alerts such as new orders.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input type="checkbox" name="taxEnabled" defaultChecked={initial.taxEnabled} className="h-4 w-4 rounded border-outline-variant" />
            Apply tax to orders (not yet — Phase 1 default is off)
          </label>
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              name="guestCheckoutEnabled"
              defaultChecked={initial.guestCheckoutEnabled}
              className="h-4 w-4 rounded border-outline-variant"
            />
            Allow guest checkout
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery fees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-56">
            <Label htmlFor="deliveryFee">Default fee</Label>
            <Input id="deliveryFee" name="deliveryFee" type="number" step="0.01" min="0" defaultValue={initial.deliveryFee} />
            <p className="mt-1 text-xs text-on-surface-variant">Used when a governorate has no fee of its own.</p>
          </div>

          <div>
            <Label>Per-governorate fees</Label>
            <p className="mb-2 mt-1 text-xs text-on-surface-variant">
              Customers pick their governorate from this list at checkout, and the matching fee is applied automatically.
            </p>
            <div className="space-y-2">
              {fees.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={f.name}
                    onChange={(e) => setFee(i, { name: e.target.value })}
                    placeholder="Governorate (e.g. Dakahlia)"
                    aria-label={`Governorate ${i + 1} name`}
                    className="flex-1"
                  />
                  <Input
                    value={f.fee}
                    onChange={(e) => setFee(i, { fee: e.target.value })}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Fee"
                    aria-label={`Governorate ${i + 1} fee`}
                    className="w-28"
                  />
                  <button
                    type="button"
                    onClick={() => setFees((prev) => prev.filter((_, j) => j !== i))}
                    aria-label={`Remove ${f.name || "row"}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-outline-variant text-error hover:bg-error-container/40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setFees((prev) => [...prev, { name: "", fee: "" }])}
            >
              <Plus size={14} className="me-1" /> Add governorate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>InstaPay account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-on-surface-variant">
            Shown to customers at checkout when they choose InstaPay, so they know where to send the payment.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="instapayNumber">InstaPay number / handle</Label>
              <Input id="instapayNumber" name="instapayNumber" placeholder="e.g. 01012345678" defaultValue={initial.instapayNumber} />
            </div>
            <div>
              <Label htmlFor="instapayName">Account name</Label>
              <Input id="instapayName" name="instapayName" placeholder="e.g. Verella Coffee" defaultValue={initial.instapayName} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" loading={pending}>
        Save settings
      </Button>
    </form>
  );
}
