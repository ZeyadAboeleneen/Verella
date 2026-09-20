import type { Metadata } from "next";
import { SimplePageHero } from "@/components/SimplePageHero";

export const metadata: Metadata = {
  title: "Shipping & Returns | Verella",
  description: "Delivery timelines, pickup options, and our return policy.",
};

export default function ShippingReturnsPage() {
  return (
    <div>
      <SimplePageHero eyebrow="Support" title="Shipping & Returns" />
      <section className="py-16 px-5 md:px-16 max-w-3xl mx-auto space-y-8 text-[#4A3026] leading-relaxed">
        <div className="space-y-3">
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-semibold text-black">Delivery</h2>
          <p>
            We deliver across Mansoura and surrounding areas, with most orders arriving within 1-2 business days.
            A flat delivery fee applies at checkout, or choose pickup at our flagship branch for free.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-semibold text-black">Pickup</h2>
          <p>
            Select &quot;Pickup&quot; at checkout to collect your order at Taksem Khattab, Mansoura once it&apos;s ready. We&apos;ll
            notify you when your order status changes to ready for pickup.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-semibold text-black">Returns & exchanges</h2>
          <p>
            If your order arrives damaged or incorrect, contact us within 48 hours of delivery with your order number
            and we&apos;ll arrange a replacement or refund. Due to the perishable nature of coffee, we&apos;re unable to
            accept returns on opened products for reasons other than quality issues.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-semibold text-black">Questions?</h2>
          <p>
            Reach out via our <a href="/contact" className="text-[#57392D] underline">Contact page</a> and we&apos;ll help
            sort it out.
          </p>
        </div>
      </section>
    </div>
  );
}
