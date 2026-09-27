"use client";

import { useRef } from "react";
import Link from "@/components/LocaleLink";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Check, MessageCircle, XCircle } from "lucide-react";
import type { OrderStatus } from "@verella/db";
import { EASE_OUT, Reveal, RevealText } from "@/components/motion/Reveal";
import { VMark } from "@/components/brand/Logo";
import { InstapayUpload } from "@/components/checkout/instapay-upload";
import { BRAND_CONTACT } from "@/lib/brand";
import type { Dictionary } from "@/lib/i18n";

const DELIVERY_FLOW: OrderStatus[] = ["pending", "confirmed", "preparing", "out_for_delivery", "completed"];
const PICKUP_FLOW: OrderStatus[] = ["pending", "confirmed", "preparing", "ready_for_pickup", "completed"];

/** Success badge: springs in on mount with a soft pulsing ring behind it. */
function SuccessBadge() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto mb-8 flex h-20 w-20 items-center justify-center">
      {!reduce && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-champagne/20"
          initial={{ scale: 0.8, opacity: 0.6 }}
          animate={{ scale: [0.8, 1.6], opacity: [0.6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
        />
      )}
      <motion.span
        className="relative flex h-16 w-16 items-center justify-center rounded-full bg-plum shadow-[0_8px_30px_rgba(20,20,20,0.15)]"
        initial={reduce ? undefined : { scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
      >
        <VMark size={26} className="text-champagne" />
      </motion.span>
    </div>
  );
}

/** Status stepper — the connecting line draws itself to the current step, and each reached icon pops in with a stagger. */
function StatusTimeline({
  status,
  fulfillmentType,
  labels,
}: {
  status: OrderStatus;
  fulfillmentType: string;
  labels: Dictionary["order"];
}) {
  const reduce = useReducedMotion();

  if (status === "cancelled") {
    return (
      <motion.div
        initial={reduce ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        className="flex items-center justify-center gap-2 rounded-2xl bg-error-container/40 p-5 text-sm text-on-error-container"
      >
        <XCircle size={18} /> {labels.cancelled}
      </motion.div>
    );
  }

  const pickup = fulfillmentType === "pickup";
  const flow = pickup ? PICKUP_FLOW : DELIVERY_FLOW;
  const currentIndex = Math.max(0, flow.indexOf(status));
  const progress = flow.length > 1 ? currentIndex / (flow.length - 1) : 0;
  const stepLabel = (s: OrderStatus) =>
    s === "completed" && pickup ? labels.steps.pickedUp : labels.steps[s as keyof typeof labels.steps];

  return (
    <div className="relative rounded-2xl bg-surface-container-lowest p-6 py-8">
      <ol className="relative flex items-start">
        {/* Base track + animated fill, spanning between the first and last step's centres. */}
        <div aria-hidden="true" className="absolute top-3 left-[calc(100%/10)] right-[calc(100%/10)] h-px bg-beige">
          <motion.div
            className="h-full origin-left bg-charcoal rtl:origin-right"
            initial={reduce ? undefined : { scaleX: 0 }}
            animate={{ scaleX: progress }}
            transition={{ duration: 1, delay: 0.3, ease: EASE_OUT }}
          />
        </div>

        {flow.map((step, i) => {
          const reached = i <= currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <li key={step} className="relative flex-1">
              <div className="relative flex flex-col items-center gap-2">
                <motion.span
                  className={`relative flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${
                    reached ? "bg-charcoal text-ivory" : "border border-beige bg-ivory text-on-surface-variant"
                  }`}
                  initial={reduce ? undefined : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.15 + i * 0.12 }}
                >
                  {isCurrent && !reduce && (
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full ring-4 ring-gold/25"
                      animate={{ scale: [1, 1.35], opacity: [0.8, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                  {reached ? <Check size={12} /> : i + 1}
                </motion.span>
                <motion.span
                  className={`text-center text-[11px] leading-tight ${reached ? "text-charcoal" : "text-on-surface-variant"}`}
                  initial={reduce ? undefined : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.25 + i * 0.12, ease: EASE_OUT }}
                >
                  {stepLabel(step)}
                </motion.span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

interface OrderItemView {
  id: number;
  nameSnapshot: string;
  variantLabelSnapshot: string | null;
  quantity: number;
  lineTotalFormatted: string;
}

export function OrderConfirmation({
  orderNumber,
  status,
  fulfillmentType,
  items,
  subtotalFormatted,
  discountFormatted,
  deliveryFeeFormatted,
  totalFormatted,
  paymentMethodLabel,
  deliverToValue,
  showWalletUpload,
  showWalletSubmitted,
  walletHint,
  dict,
}: {
  orderNumber: string;
  status: OrderStatus;
  fulfillmentType: string;
  items: OrderItemView[];
  subtotalFormatted: string;
  discountFormatted: string | null;
  deliveryFeeFormatted: string | null;
  totalFormatted: string;
  paymentMethodLabel: string | null;
  deliverToValue: string | null;
  showWalletUpload: boolean;
  showWalletSubmitted: boolean;
  walletHint: string;
  dict: Dictionary;
}) {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const markY = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const markOpacity = useTransform(scrollYProgress, [0, 1], [0.06, 0]);

  const t = dict.order;

  return (
    <div>
      {/* Hero: dark band with a large parallax V-mark watermark, matching the brand's other dark sections. */}
      <div ref={heroRef} className="relative overflow-hidden bg-dusk px-5 py-16 text-center text-ivory md:py-24">
        {!reduce && (
          <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ y: markY, opacity: markOpacity }}>
            <VMark size={420} className="text-ivory" />
          </motion.div>
        )}
        <div className="relative mx-auto max-w-2xl">
          <SuccessBadge />
          <RevealText
            text={t.thanks}
            as="h1"
            className="font-display text-3xl font-medium md:text-4xl"
          />
          <Reveal delay={0.35}>
            <p className="mt-3 text-sm text-ivory/70">
              {t.number.replace("{number}", "")}
              <span className="font-medium tracking-wider text-champagne" dir="ltr">
                {orderNumber}
              </span>
            </p>
          </Reveal>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-10 md:py-14">
        <Reveal>
          <StatusTimeline status={status} fulfillmentType={fulfillmentType} labels={t} />
        </Reveal>

        {showWalletUpload && (
          <Reveal delay={0.1} className="mt-6">
            <InstapayUpload orderNumber={orderNumber} hint={walletHint} />
          </Reveal>
        )}
        {showWalletSubmitted && (
          <Reveal delay={0.1}>
            <p className="mt-6 rounded-xl bg-secondary-container/50 px-4 py-3 text-center text-sm text-charcoal">{t.proofSubmitted}</p>
          </Reveal>
        )}

        <Reveal delay={0.1} className="mt-6 rounded-2xl bg-surface-container-lowest p-6">
          <ul className="divide-y divide-beige">
            {items.map((item, i) => (
              <motion.li
                key={item.id}
                className="flex justify-between gap-4 py-3 text-sm first:pt-0"
                initial={reduce ? undefined : { opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: EASE_OUT }}
              >
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <span className="text-charcoal">{item.nameSnapshot}</span>
                  {item.variantLabelSnapshot && (
                    <span className="text-xs uppercase tracking-wider text-on-surface-variant">{item.variantLabelSnapshot}</span>
                  )}
                  <span className="text-on-surface-variant">× {item.quantity}</span>
                </span>
                <span className="shrink-0 text-charcoal">{item.lineTotalFormatted}</span>
              </motion.li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-beige pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-on-surface-variant">{dict.checkout.subtotal}</dt>
              <dd className="text-charcoal">{subtotalFormatted}</dd>
            </div>
            {discountFormatted && (
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">{dict.checkout.discount}</dt>
                <dd className="text-gold-ink">−{discountFormatted}</dd>
              </div>
            )}
            {deliveryFeeFormatted && (
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">{dict.checkout.deliveryFee}</dt>
                <dd className="text-charcoal">{deliveryFeeFormatted}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-beige pt-3">
              <dt className="font-medium text-charcoal">{dict.checkout.total}</dt>
              <dd className="text-xl font-medium text-charcoal">{totalFormatted}</dd>
            </div>
          </dl>

          {(paymentMethodLabel || deliverToValue) && (
            <div className="mt-6 grid gap-4 border-t border-beige pt-5 text-sm sm:grid-cols-2">
              {paymentMethodLabel && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">{t.payment}</p>
                  <p className="mt-1 text-charcoal">{paymentMethodLabel}</p>
                </div>
              )}
              {deliverToValue && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">{t.deliverTo}</p>
                  <p className="mt-1 text-charcoal">{deliverToValue}</p>
                </div>
              )}
            </div>
          )}
        </Reveal>

        <Reveal delay={0.15} className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-on-surface-variant">{t.questions}</p>
          <motion.a
            href={BRAND_CONTACT.whatsapp.href}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={reduce ? undefined : { scale: 1.04 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-charcoal px-6 text-xs font-medium uppercase tracking-[0.2em] text-charcoal transition-colors hover:bg-plum hover:text-ivory"
          >
            <MessageCircle size={14} /> {t.whatsapp}
          </motion.a>
          <Link href="/store" className="text-xs text-on-surface-variant underline-offset-4 hover:text-charcoal hover:underline">
            {t.continueShopping}
          </Link>
        </Reveal>
      </div>
    </div>
  );
}
