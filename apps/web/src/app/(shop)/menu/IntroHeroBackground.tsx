"use client";

import { useEffect, useState } from "react";

const HERO_SLIDE_INTERVAL_MS = 6000;

/** Intro banner background — crossfades through the admin-managed hero images. */
export function IntroHeroBackground({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => setActive((i) => (i + 1) % images.length), HERO_SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div className="absolute inset-0 z-0">
      {images.map((url, i) => (
        <div
          key={url}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
            i === active ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url('${url}')` }}
          aria-hidden={i !== active}
        />
      ))}
      <div className="absolute inset-0 bg-black/55" />
    </div>
  );
}
