import ar from "@/lib/i18n/dictionaries/ar.json";
import en from "@/lib/i18n/dictionaries/en.json";
import { EMPTY_OFFER, OfferForm } from "@/components/admin/offers/offer-form";
import { getOfferLinkTargets } from "@/lib/offers/link-targets";

export default async function NewOfferPage() {
  const linkTargets = await getOfferLinkTargets();
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-on-surface">New offer</h1>
      <OfferForm initial={EMPTY_OFFER} labels={{ ar: ar.offers, en: en.offers }} linkTargets={linkTargets} />
    </div>
  );
}
