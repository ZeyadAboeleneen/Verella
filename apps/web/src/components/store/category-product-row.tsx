"use client";

import { useRef } from "react";
import ProductCard from "@/components/ProductCard";
import type { StoreProductView } from "@/lib/store/queries";

interface CategoryProductRowProps {
  categoryName: string;
  products: StoreProductView[];
  addToCartLabel?: string;
  addedLabel?: string;
  swipeHint?: string;
}

export function CategoryProductRow({
  categoryName,
  products,
  addToCartLabel,
  addedLabel,
  swipeHint,
}: CategoryProductRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === "left" ? -320 : 320;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  return (
    <div className="mb-12 md:mb-16 last:mb-0">
      {/* Category Header Row */}
      <div className="flex items-end justify-between border-b border-[#e8d5bc]/50 pb-4 mb-6 md:mb-8">
        <h2 className="font-[family-name:var(--font-plus-jakarta)] text-xl md:text-2xl font-bold uppercase tracking-wider text-[#57392D]">
          {categoryName}
        </h2>

        {/* Minimal Scroll Arrows */}
        <div className="hidden md:flex items-center gap-2" dir="ltr">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Previous products"
            className="w-9 h-9 rounded-full border border-[#8E7B6A]/40 flex items-center justify-center text-[#57392D] hover:bg-[#57392D] hover:text-white hover:border-[#57392D] active:scale-95 transition-all"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg select-none">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Next products"
            className="w-9 h-9 rounded-full border border-[#8E7B6A]/40 flex items-center justify-center text-[#57392D] hover:bg-[#57392D] hover:text-white hover:border-[#57392D] active:scale-95 transition-all"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg select-none">
              chevron_right
            </span>
          </button>
        </div>
      </div>

      {/* Product Cards Row */}
      <div
        ref={scrollRef}
        className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar pb-3 scroll-smooth -mx-5 px-5 md:-mx-0 md:px-0"
        dir="ltr"
      >
        {products.map((p) => (
          <div key={p.id} className="w-[calc(50%-8px)] sm:w-[240px] md:w-[280px] shrink-0 min-w-[150px]">
            <ProductCard
              productId={p.id}
              slug={p.slug}
              name={p.name}
              price={p.price}
              compareAtPrice={p.compareAtPrice}
              rating={p.rating}
              tag={p.tag}
              badge={p.badge}
              image={p.image}
              alt={p.alt}
              addToCartLabel={addToCartLabel}
              addedLabel={addedLabel}
            />
          </div>
        ))}
      </div>

      {/* Swipe Hint Text */}
      <p className="text-center text-xs md:text-sm font-bold text-[#57392D] mt-4 tracking-wide">
        {swipeHint ?? "Swipe to see more →"}
      </p>
    </div>
  );
}


