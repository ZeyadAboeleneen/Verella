"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { addToCartAction } from "@/lib/cart/actions";
import { notifyAddedToCart } from "@/lib/cart/added-to-cart-bus";
import type { StoreProductDetailView } from "@/lib/store/queries";

export function ProductDetail({
  product,
  dict,
}: {
  product: StoreProductDetailView;
  dict: { addToCart: string; added: string; outOfStock: string };
}) {
  const validImages = product.images.filter((img) => Boolean(img?.url));
  const images = validImages.length > 0 ? validImages : (product.image ? [{ url: product.image, alt: product.alt }] : []);

  const [activeImage, setActiveImage] = useState(0);
  const currentImg = images[activeImage];
  const [imgError, setImgError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outOfStock = product.stockQty <= 0;

  function handleAddToCart() {
    setError(null);
    startTransition(async () => {
      const res = await addToCartAction(product.id, quantity);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
      notifyAddedToCart({ name: product.name, image: product.image, meta: [product.tag, product.price].filter(Boolean).join(" · ") });
    });
  }

  return (
    <div className="grid gap-10 md:grid-cols-2">
      {/* Gallery */}
      <div>
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-[#FCE8CD]">
          {!imgError && currentImg && Boolean(currentImg.url) ? (
            <Image
              src={currentImg.url}
              alt={currentImg.alt || ""}
              fill
              className="object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="material-symbols-outlined text-6xl text-[#8E7B6A]">local_cafe</span>
            </div>
          )}
          {product.badge && (
            <span className="absolute top-4 start-4 rounded-full bg-[#57392D] px-3 py-1 text-xs uppercase tracking-tighter text-white">
              {product.badge}
            </span>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-4 flex gap-3">
            {images.map((img, i) => {
              if (!img.url) return null;
              return (
                <button
                  key={img.url + i}
                  type="button"
                  onClick={() => {
                    setActiveImage(i);
                    setImgError(false);
                  }}
                  className={`h-16 w-16 overflow-hidden rounded-xl border-2 ${i === activeImage ? "border-[#57392D]" : "border-transparent"}`}
                >
                  <Image src={img.url} alt={img.alt || ""} width={64} height={64} className="h-full w-full object-cover" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        {product.rating != null && (
          <span className="mb-2 flex items-center gap-1 text-xs font-semibold text-[#57392D]">
            <span aria-hidden="true" className="flex items-center gap-1">
              {product.rating}{" "}
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
            </span>
            <span className="sr-only">{product.rating} out of 5 stars</span>
          </span>
        )}
        <h1 className="font-[family-name:var(--font-plus-jakarta)] text-3xl font-bold text-black md:text-4xl">{product.name}</h1>
        <div className="mt-3 flex items-baseline gap-3">
          <span className={`text-2xl font-semibold ${product.compareAtPrice ? "text-red-600" : "text-[#57392D]"}`}>{product.price}</span>
          {product.compareAtPrice && <span className="text-lg text-[#8E7B6A] line-through">{product.compareAtPrice}</span>}
        </div>

        {product.description && <p className="mt-6 leading-relaxed text-[#4A3026]">{product.description}</p>}
        {product.notes && <p className="mt-3 text-sm italic leading-relaxed text-[#8E7B6A]">{product.notes}</p>}

        {outOfStock ? (
          <p className="mt-8 text-sm font-semibold text-error">{dict.outOfStock}</p>
        ) : (
          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-full border border-[#8E7B6A]/40 px-2 py-1">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#000000] hover:bg-[#FCE8CD]"
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(product.stockQty, q + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#000000] hover:bg-[#FCE8CD]"
              >
                <Plus size={14} />
              </button>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={pending}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-black text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-[#57392D] disabled:opacity-60"
            >
              {added ? "✓" : <ShoppingCart size={16} />}
              {added ? dict.added : dict.addToCart}
            </button>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-error">{error}</p>}
      </div>
    </div>
  );
}
