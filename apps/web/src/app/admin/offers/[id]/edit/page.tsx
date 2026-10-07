import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, media, offers } from "@verella/db";
import ar from "@/lib/i18n/dictionaries/ar.json";
import en from "@/lib/i18n/dictionaries/en.json";
import { OfferForm } from "@/components/admin/offers/offer-form";
import { getOfferLinkTargets } from "@/lib/offers/link-targets";

/** "YYYY-MM-DDTHH:mm" in the server's local time, for a datetime-local input. */
function toDatetimeLocal(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db
    .select({ offer: offers, image: media.url })
    .from(offers)
    .leftJoin(media, eq(media.id, offers.imageMediaId))
    .where(eq(offers.id, Number(id)))
    .limit(1);
  if (!row) notFound();
  const o = row.offer;
  const linkTargets = await getOfferLinkTargets();

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-on-surface">Edit offer</h1>
      <OfferForm
        offerId={o.id}
        labels={{ ar: ar.offers, en: en.offers }}
        linkTargets={linkTargets}
        initial={{
          titleAr: o.titleAr,
          titleEn: o.titleEn,
          bodyAr: o.bodyAr ?? "",
          bodyEn: o.bodyEn ?? "",
          highlightAr: o.highlightAr ?? "",
          highlightEn: o.highlightEn ?? "",
          ctaLabelAr: o.ctaLabelAr ?? "",
          ctaLabelEn: o.ctaLabelEn ?? "",
          linkUrl: o.linkUrl ?? "",
          code: o.code ?? "",
          image: o.imageMediaId && row.image ? { id: o.imageMediaId, url: row.image } : null,
          showInBar: o.showInBar,
          showInCards: o.showInCards,
          isActive: o.isActive,
          startsAt: toDatetimeLocal(o.startsAt),
          endsAt: toDatetimeLocal(o.endsAt),
          sortOrder: o.sortOrder,
        }}
      />
    </div>
  );
}
