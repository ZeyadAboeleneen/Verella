"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutPanelTop, RectangleHorizontal } from "lucide-react";
import { createOfferAction, updateOfferAction, type OfferInput } from "@/lib/offers/actions";
import type { OfferView } from "@/lib/offers/queries";
import { MediaPicker, type PickedMedia } from "@/components/admin/media-picker";
import { AnnouncementBar } from "@/components/offers/AnnouncementBar";
import { OfferCard } from "@/components/offers/OffersSection";
import type { OfferLabels } from "@/components/offers/offer-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, FormError } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

export interface OfferFormValues {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  highlightAr: string;
  highlightEn: string;
  ctaLabelAr: string;
  ctaLabelEn: string;
  linkUrl: string;
  code: string;
  image: PickedMedia | null;
  showInBar: boolean;
  showInCards: boolean;
  isActive: boolean;
  /** "YYYY-MM-DDTHH:mm" (datetime-local) or "". */
  startsAt: string;
  endsAt: string;
  sortOrder: number;
}

export const EMPTY_OFFER: OfferFormValues = {
  titleAr: "",
  titleEn: "",
  bodyAr: "",
  bodyEn: "",
  highlightAr: "",
  highlightEn: "",
  ctaLabelAr: "",
  ctaLabelEn: "",
  linkUrl: "",
  code: "",
  image: null,
  showInBar: true,
  showInCards: true,
  isActive: true,
  startsAt: "",
  endsAt: "",
  sortOrder: 0,
};

const textarea =
  "flex min-h-[84px] w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none focus:border-on-surface";

function PlacementTile({
  checked,
  onChange,
  icon,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
        checked ? "border-on-surface bg-surface-container-low ring-1 ring-on-surface" : "border-outline-variant hover:border-on-surface-variant"
      }`}
    >
      <input type="checkbox" className="mt-1 h-4 w-4 accent-charcoal" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="mt-0.5 text-on-surface-variant">{icon}</span>
      <span>
        <span className="block text-sm font-semibold text-on-surface">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-on-surface-variant">{hint}</span>
      </span>
    </label>
  );
}

export function OfferForm({
  offerId,
  initial,
  labels,
}: {
  offerId?: number;
  initial: OfferFormValues;
  labels: { ar: OfferLabels; en: OfferLabels };
}) {
  const router = useRouter();
  const [v, setV] = useState<OfferFormValues>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewLocale, setPreviewLocale] = useState<"ar" | "en">("ar");
  const set = <K extends keyof OfferFormValues>(key: K, value: OfferFormValues[K]) => setV((prev) => ({ ...prev, [key]: value }));

  async function save() {
    setPending(true);
    setError(null);
    const input: OfferInput = {
      titleAr: v.titleAr,
      titleEn: v.titleEn,
      bodyAr: v.bodyAr,
      bodyEn: v.bodyEn,
      highlightAr: v.highlightAr,
      highlightEn: v.highlightEn,
      ctaLabelAr: v.ctaLabelAr,
      ctaLabelEn: v.ctaLabelEn,
      linkUrl: v.linkUrl,
      code: v.code,
      imageMediaId: v.image?.id ?? null,
      showInBar: v.showInBar,
      showInCards: v.showInCards,
      isActive: v.isActive,
      // datetime-local is the admin's local time; send an absolute instant.
      startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : null,
      endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : null,
      sortOrder: Number(v.sortOrder) || 0,
    };
    const res = offerId ? await updateOfferAction(offerId, input) : await createOfferAction(input);
    setPending(false);
    if ("error" in res) {
      setError(res.error);
      toast(res.error, "error");
      return;
    }
    toast(offerId ? "Offer updated." : "Offer created.");
    router.push("/admin/offers");
    router.refresh();
  }

  const ar = previewLocale === "ar";
  const preview: OfferView = {
    id: offerId ?? 0,
    title: (ar ? v.titleAr : v.titleEn) || (ar ? "عنوان العرض" : "Offer title"),
    body: (ar ? v.bodyAr : v.bodyEn) || null,
    highlight: (ar ? v.highlightAr : v.highlightEn) || null,
    ctaLabel: (ar ? v.ctaLabelAr : v.ctaLabelEn) || null,
    href: v.linkUrl || null,
    code: v.code ? v.code.toUpperCase() : null,
    image: v.image?.url ?? null,
    endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : null,
    showInBar: v.showInBar,
    showInCards: v.showInCards,
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-6">
        <FormError>{error}</FormError>

        <Card>
          <CardHeader>
            <CardTitle>Where to show it</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <PlacementTile
              checked={v.showInBar}
              onChange={(c) => set("showInBar", c)}
              icon={<LayoutPanelTop size={20} />}
              title="Top announcement bar"
              hint="Thin strip above the menu on every page. Uses the title, highlight, code and link."
            />
            <PlacementTile
              checked={v.showInCards}
              onChange={(c) => set("showInCards", c)}
              icon={<RectangleHorizontal size={20} />}
              title="Home page offer cards"
              hint="Big image cards on the home page, under the categories. Uses everything, including the image."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="titleAr">Title (Arabic) *</Label>
                <Input id="titleAr" dir="rtl" value={v.titleAr} onChange={(e) => set("titleAr", e.target.value)} placeholder="خصم 20% على كل المسك" maxLength={160} />
              </div>
              <div>
                <Label htmlFor="titleEn">Title (English) *</Label>
                <Input id="titleEn" value={v.titleEn} onChange={(e) => set("titleEn", e.target.value)} placeholder="20% off all musk" maxLength={160} />
              </div>
              <div>
                <Label htmlFor="bodyAr">Text (Arabic)</Label>
                <textarea id="bodyAr" dir="rtl" className={textarea} value={v.bodyAr} onChange={(e) => set("bodyAr", e.target.value)} maxLength={600} placeholder="سطر أو اتنين عن العرض — بيظهر في الكروت بس." />
              </div>
              <div>
                <Label htmlFor="bodyEn">Text (English)</Label>
                <textarea id="bodyEn" className={textarea} value={v.bodyEn} onChange={(e) => set("bodyEn", e.target.value)} maxLength={600} placeholder="A line or two about the offer — cards only." />
              </div>
              <div>
                <Label htmlFor="highlightAr">Highlight (Arabic)</Label>
                <Input id="highlightAr" dir="rtl" value={v.highlightAr} onChange={(e) => set("highlightAr", e.target.value)} placeholder="−20% · شحن مجاني" maxLength={40} />
              </div>
              <div>
                <Label htmlFor="highlightEn">Highlight (English)</Label>
                <Input id="highlightEn" value={v.highlightEn} onChange={(e) => set("highlightEn", e.target.value)} placeholder="−20% · Free delivery" maxLength={40} />
              </div>
            </div>
            <p className="text-xs text-on-surface-variant">The highlight is the short gold tag, e.g. “−20%”. Leave the English fields empty and the Arabic shows for everyone (and the other way round).</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Button, link &amp; code</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="linkUrl">Link</Label>
              <Input id="linkUrl" dir="ltr" value={v.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} placeholder="/store?category=musk" />
              <p className="mt-1 text-xs text-on-surface-variant">A page on the site (starts with /) or a full https:// link. Empty = no button.</p>
            </div>
            <div>
              <Label htmlFor="ctaLabelAr">Button text (Arabic)</Label>
              <Input id="ctaLabelAr" dir="rtl" value={v.ctaLabelAr} onChange={(e) => set("ctaLabelAr", e.target.value)} placeholder="تسوّق دلوقتي" maxLength={60} />
            </div>
            <div>
              <Label htmlFor="ctaLabelEn">Button text (English)</Label>
              <Input id="ctaLabelEn" value={v.ctaLabelEn} onChange={(e) => set("ctaLabelEn", e.target.value)} placeholder="Shop now" maxLength={60} />
            </div>
            <div>
              <Label htmlFor="code">Discount code</Label>
              <Input id="code" dir="ltr" className="uppercase" value={v.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="SUMMER20" maxLength={50} />
              <p className="mt-1 text-xs text-on-surface-variant">Shown as a tap-to-copy chip. Create the code itself under Discounts.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Image</CardTitle>
          </CardHeader>
          <CardContent>
            <MediaPicker value={v.image} onChange={(m) => set("image", m)} label="Card image" />
            <p className="mt-2 text-xs text-on-surface-variant">For the home-page card. Landscape photos work best. Without one, the card uses the brand’s dark-and-gold design.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule &amp; status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="startsAt">Starts</Label>
                <Input id="startsAt" type="datetime-local" value={v.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="endsAt">Ends</Label>
                <Input id="endsAt" type="datetime-local" value={v.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sortOrder">Order</Label>
                <Input id="sortOrder" type="number" min={0} value={v.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} />
              </div>
            </div>
            <p className="text-xs text-on-surface-variant">Leave dates empty to show it right away and keep it until you turn it off. In the last 14 days the card shows a countdown. Lower order shows first.</p>
            <label className="flex items-center gap-2 text-sm text-on-surface">
              <input type="checkbox" className="h-4 w-4 accent-charcoal" checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} />
              Active
            </label>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" loading={pending} onClick={save}>
            {offerId ? "Save offer" : "Create offer"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/offers")}>
            Cancel
          </Button>
        </div>
      </div>

      {/* Live preview */}
      <aside className="xl:sticky xl:top-6 xl:self-start">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Preview</CardTitle>
            <div className="flex rounded-full border border-outline-variant p-0.5 text-xs">
              {(["ar", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setPreviewLocale(l)}
                  className={`rounded-full px-3 py-1 font-semibold ${previewLocale === l ? "bg-on-surface text-surface" : "text-on-surface-variant"}`}
                >
                  {l === "ar" ? "عربي" : "English"}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-5" dir={ar ? "rtl" : "ltr"} lang={previewLocale}>
            {v.showInBar && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant" dir="ltr">Top bar</p>
                <div className="overflow-hidden rounded-xl">
                  <AnnouncementBar offers={[preview]} labels={labels[previewLocale]} preview />
                </div>
              </div>
            )}
            {v.showInCards && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant" dir="ltr">Home page card</p>
                <OfferCard offer={preview} labels={labels[previewLocale]} preview />
              </div>
            )}
            {!v.showInBar && !v.showInCards && <p className="text-sm text-on-surface-variant" dir="ltr">Pick at least one place to show it.</p>}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
