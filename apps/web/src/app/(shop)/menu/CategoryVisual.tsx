"use client";

import { useState } from "react";
import Image from "next/image";
import type { MenuSectionView as MenuSection } from "@/lib/menu/queries";

/** Full-bleed image with a graceful icon fallback — shared by the grid tile and section banner. */
export function CategoryVisual({ section, sizes }: { section: MenuSection; sizes: string }) {
  const [imgError, setImgError] = useState(false);
  if (section.image && !imgError) {
    return (
      <Image
        src={section.image}
        alt=""
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#3a2614] to-[#000000]">
      <span aria-hidden="true" className="material-symbols-outlined text-5xl text-[#FFE2C6]/70">
        {section.icon}
      </span>
    </div>
  );
}
