"use client";

import { useActionState } from "react";
import { sendContactMessageAction } from "@/lib/contact/actions";
import type { ActionResult } from "@/lib/auth/rbac";
import type { Dictionary } from "@/lib/i18n";
import { MailCheck } from "lucide-react";
import { Honeypot } from "@/components/Honeypot";

const inputClasses =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm text-charcoal placeholder:text-on-surface-variant transition-colors focus:border-charcoal focus:outline-none";

export function ContactForm({ labels: t }: { labels: Dictionary["contact"] }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(sendContactMessageAction, null);
  const sent = state && "success" in state;

  if (sent) {
    return (
      <div className="rounded-2xl border border-beige/60 bg-surface-container-low p-8 text-center">
        <MailCheck size={36} className="mx-auto text-gold" aria-hidden="true" />
        <h3 className="mt-3 font-[family-name:var(--font-display)] text-xl font-medium text-charcoal">{t.sentTitle}</h3>
        <p className="mt-2 text-sm text-charcoal/80">
          {t.sentBody}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="relative space-y-4">
      <Honeypot />
      {state && "error" in state && (
        <p role="alert" className="rounded-xl bg-error-container/50 px-4 py-3 text-sm text-on-error-container">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant">
            {t.name}
          </label>
          <input id="contact-name" name="name" required minLength={2} className={inputClasses} placeholder={t.namePh} />
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant">
            {t.emailLabel}
          </label>
          <input id="contact-email" name="email" type="email" required className={inputClasses} placeholder={t.emailPh} dir="ltr" />
        </div>
      </div>
      <div>
        <label htmlFor="contact-subject" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant">
          {t.subject}
        </label>
        <input id="contact-subject" name="subject" required minLength={3} className={inputClasses} placeholder={t.subjectPh} />
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant">
          {t.message}
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          rows={6}
          className={`${inputClasses} resize-y`}
          placeholder={t.messagePh}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-charcoal py-4 text-xs font-semibold uppercase tracking-widest text-ivory transition-colors hover:bg-primary-container disabled:opacity-60 sm:w-auto sm:px-10"
      >
        {pending ? t.sending : t.send}
      </button>
    </form>
  );
}
