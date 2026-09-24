"use client";

import Image from "next/image";
import Link from "@/components/LocaleLink";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { VMark } from "@/components/brand/Logo";
import { Reveal, RevealText } from "@/components/motion/Reveal";

/** Editorial story block: parallax photo, clip reveal, and copy on the opposite side. */
export function EditorialFeature({
  eyebrow,
  title,
  body,
  cta,
  href,
  image,
  flip = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  image: string | null;
  flip?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  const clip = useTransform(scrollYProgress, [0, 0.35], ["inset(18% 10% 18% 10% round 24px)", "inset(0% 0% 0% 0% round 24px)"]);

  return (
    <section className="mx-auto max-w-[1400px] px-5 py-16 md:px-16 md:py-24">
      <div className={`grid items-center gap-10 md:grid-cols-12 md:gap-16 ${flip ? "md:[&>*:first-child]:order-2" : ""}`}>
        <motion.div
          ref={ref}
          className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-charcoal md:col-span-7 md:aspect-[5/6]"
          style={reduce ? undefined : { clipPath: clip }}
        >
          {image ? (
            <motion.div className="absolute inset-[-12%_0]" style={reduce ? undefined : { y }}>
              <Image src={image} alt="" fill sizes="(min-width: 768px) 58vw, 100vw" className="object-cover" />
            </motion.div>
          ) : (
            <span className="absolute inset-0 flex items-center justify-center">
              <VMark size={180} className="text-champagne/20" />
            </span>
          )}
        </motion.div>

        <div className="md:col-span-5">
          <Reveal>
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-gold-ink">{eyebrow}</p>
          </Reveal>
          <RevealText
            text={title}
            className="font-[family-name:var(--font-display)] text-4xl font-medium uppercase leading-[0.95] tracking-tight text-charcoal md:text-6xl"
          />
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-md text-base leading-relaxed text-charcoal/70">{body}</p>
          </Reveal>
          <Reveal delay={0.25}>
            <Link
              href={href}
              className="group mt-8 inline-flex h-14 items-center gap-3 rounded-full border border-charcoal px-7 text-xs font-medium uppercase tracking-[0.25em] text-charcoal transition-colors duration-300 hover:bg-charcoal hover:text-ivory"
            >
              {cta}
              <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
