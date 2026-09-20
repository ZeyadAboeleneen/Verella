import type { Metadata } from "next";
import { SimplePageHero } from "@/components/SimplePageHero";

export const metadata: Metadata = {
  title: "FAQ | Verella",
  description: "Frequently asked questions about ordering, delivery, and payment at Verella Coffee.",
};

const FAQS = [
  {
    q: "How do I place an order?",
    a: "Browse our store, add items to your cart, and check out as a guest or signed-in customer. You can choose delivery or pickup at checkout.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept Cash on Delivery and InstaPay. InstaPay transfers are reviewed manually and your order is confirmed once payment is verified.",
  },
  {
    q: "How long does delivery take?",
    a: "Most orders within Mansoura are delivered within 1-2 business days. You'll receive updates as your order status changes.",
  },
  {
    q: "Can I track my order?",
    a: "Yes — sign in and visit your account's Orders page, or use your guest order number on the order lookup page.",
  },
  {
    q: "What is your return policy?",
    a: "See our Shipping & Returns page for details on returns and exchanges.",
  },
  {
    q: "Do you offer wholesale pricing?",
    a: "Yes, see our Wholesale page or contact us directly for bulk and business inquiries.",
  },
];

export default function FaqPage() {
  return (
    <div>
      <SimplePageHero eyebrow="Support" title="Frequently Asked Questions" />
      <section className="py-16 px-5 md:px-16 max-w-3xl mx-auto">
        <div className="divide-y divide-[#e8d5bc]/60">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-[family-name:var(--font-plus-jakarta)] font-semibold text-black">
                {q}
                <span className="material-symbols-outlined text-[#57392D] transition-transform group-open:rotate-180" aria-hidden="true">
                  expand_more
                </span>
              </summary>
              <p className="mt-3 text-[#4A3026] leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
