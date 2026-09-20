import type { Metadata } from "next";
import { SimplePageHero } from "@/components/SimplePageHero";

export const metadata: Metadata = {
  title: "Privacy Policy | Verella",
  description: "How Verella Coffee collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <div>
      <SimplePageHero eyebrow="Legal" title="Privacy Policy" />
      <section className="py-16 px-5 md:px-16 max-w-3xl mx-auto space-y-8 text-[#4A3026] leading-relaxed">
        <p className="text-sm text-[#8E7B6A]">Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}</p>

        <div className="space-y-3">
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-semibold text-black">Information we collect</h2>
          <p>
            When you create an account, place an order, or contact us, we collect information such as your name, email
            address, phone number, delivery addresses, and order history. Payment details for InstaPay transfers are
            reviewed manually and are not stored on our servers.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-semibold text-black">How we use it</h2>
          <p>
            We use your information to process orders, manage your account, respond to support requests, and improve
            our menu and store offerings. We do not sell your personal data to third parties.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-semibold text-black">Cookies</h2>
          <p>
            We use essential cookies to keep you signed in, remember your cart, and remember your language
            preference. We do not use third-party advertising cookies.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-semibold text-black">Your rights</h2>
          <p>
            You can review and update your account details at any time from your account page, or request deletion
            of your account by contacting us.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-semibold text-black">Contact</h2>
          <p>
            Questions about this policy can be sent to us via our <a href="/contact" className="text-[#57392D] underline">Contact page</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
