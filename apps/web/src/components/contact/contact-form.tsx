"use client";

import { useActionState } from "react";
import { sendContactMessageAction } from "@/lib/contact/actions";
import type { ActionResult } from "@/lib/auth/rbac";

const inputClasses =
  "w-full rounded-xl border border-[#e8d5bc]/70 bg-white px-4 py-3 text-sm text-[#000000] placeholder:text-[#a9988f] focus:border-[#57392D] focus:outline-none";

export function ContactForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(sendContactMessageAction, null);
  const sent = state && "success" in state;

  if (sent) {
    return (
      <div className="rounded-2xl border border-[#e8d5bc]/60 bg-[#FAECD2] p-8 text-center">
        <span aria-hidden="true" className="material-symbols-outlined text-4xl text-[#57392D]">mark_email_read</span>
        <h3 className="mt-3 font-[family-name:var(--font-plus-jakarta)] text-xl font-bold text-[#000000]">Message sent</h3>
        <p className="mt-2 text-sm text-[#4A3026]">
          Thanks for reaching out — we typically reply within 1–2 business days.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state && "error" in state && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#8E7B6A]">
            Name
          </label>
          <input id="contact-name" name="name" required minLength={2} className={inputClasses} placeholder="Your name" />
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#8E7B6A]">
            Email
          </label>
          <input id="contact-email" name="email" type="email" required className={inputClasses} placeholder="you@example.com" />
        </div>
      </div>
      <div>
        <label htmlFor="contact-subject" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#8E7B6A]">
          Subject
        </label>
        <input id="contact-subject" name="subject" required minLength={3} className={inputClasses} placeholder="How can we help?" />
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#8E7B6A]">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          rows={6}
          className={`${inputClasses} resize-y`}
          placeholder="Tell us a little more…"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[#57392D] py-4 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-[#412B22] disabled:opacity-60 sm:w-auto sm:px-10"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
