"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { MediaPicker, type PickedMedia } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, FormError } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { LinkPicker, type LinkPickerProduct } from "@/components/admin/content/link-picker";
import {
  createBannerAction,
  toggleBannerActiveAction,
  deleteBannerAction,
  reorderBannersAction,
} from "@/lib/content/actions";

interface HeroSlideItem {
  id: number;
  url: string;
  title: string | null;
  isActive: boolean;
}

const HERO_PLACEMENT = "home_hero";

export function HeroSlidesManager({ items, products }: { items: HeroSlideItem[]; products?: LinkPickerProduct[] }) {
  const router = useRouter();
  const [image, setImage] = useState<PickedMedia | null>(null);
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [subtitleEn, setSubtitleEn] = useState("");
  const [subtitleAr, setSubtitleAr] = useState("");
  const [ctaTextEn, setCtaTextEn] = useState("");
  const [ctaTextAr, setCtaTextAr] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showSecondButton, setShowSecondButton] = useState(false);
  const [ctaText2En, setCtaText2En] = useState("");
  const [ctaText2Ar, setCtaText2Ar] = useState("");
  const [link2Url, setLink2Url] = useState("");
  const [imageIsClickable, setImageIsClickable] = useState(false);
  const [imageLinkUrl, setImageLinkUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function addSlide() {
    if (!image) {
      setError("Choose an image first.");
      return;
    }
    startTransition(async () => {
      const res = await createBannerAction({
        mediaId: image.id,
        linkUrl,
        placement: HERO_PLACEMENT,
        titleEn,
        titleAr,
        subtitleEn,
        subtitleAr,
        ctaTextEn,
        ctaTextAr,
        ctaText2En: showSecondButton ? ctaText2En : undefined,
        ctaText2Ar: showSecondButton ? ctaText2Ar : undefined,
        link2Url: showSecondButton ? link2Url : undefined,
        imageLinkUrl: imageIsClickable ? imageLinkUrl : undefined,
        isActive: true,
        sortOrder: items.length,
      });
      if ("error" in res) {
        setError(res.error);
        toast(res.error, "error");
      } else {
        toast("Hero slide added.");
        setImage(null);
        setTitleEn("");
        setTitleAr("");
        setSubtitleEn("");
        setSubtitleAr("");
        setCtaTextEn("");
        setCtaTextAr("");
        setLinkUrl("");
        setShowSecondButton(false);
        setCtaText2En("");
        setCtaText2Ar("");
        setLink2Url("");
        setImageIsClickable(false);
        setImageLinkUrl("");
        router.refresh();
      }
    });
  }

  function moveSlide(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const ids = items.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    startTransition(async () => {
      await reorderBannersAction(ids);
      router.refresh();
    });
  }

  function toggleActive(id: number, isActive: boolean) {
    startTransition(async () => {
      await toggleBannerActiveAction(id, isActive);
      router.refresh();
    });
  }

  function remove(id: number) {
    startTransition(async () => {
      await deleteBannerAction(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {/* ── Add form ─────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-4">
          <FormError>{error}</FormError>
          <p className="text-sm text-on-surface-variant">
            Add one slide for a static hero, or several for a slider that rotates automatically. Text fields are
            optional — leave title, subtitle, and both buttons empty to show just the image, with no text overlay.
          </p>
          <MediaPicker value={image} onChange={setImage} label="Slide image" />

          <div className="rounded-xl border border-outline-variant/60 p-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-on-surface">
              <input
                type="checkbox"
                checked={imageIsClickable}
                onChange={(e) => {
                  setImageIsClickable(e.target.checked);
                  if (!e.target.checked) setImageLinkUrl("");
                }}
              />
              Make the image itself clickable
            </label>
            <p className="mt-1 text-xs text-on-surface-variant">
              Instead of (or in addition to) the buttons below, tapping anywhere on the image opens a page, a
              specific product, or adds a product straight to the cart — not a button, the whole image is the
              action.
            </p>
            {imageIsClickable && (
              <div className="mt-3">
                <LinkPicker
                  id="imageLinkUrl"
                  label="Image destination"
                  value={imageLinkUrl}
                  onChange={setImageLinkUrl}
                  products={products}
                  allowAddToCart
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="titleEn">Title (English)</Label>
              <Input id="titleEn" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="titleAr">Title (Arabic)</Label>
              <Input id="titleAr" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="subtitleEn">Subtitle (English)</Label>
              <Input id="subtitleEn" value={subtitleEn} onChange={(e) => setSubtitleEn(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="subtitleAr">Subtitle (Arabic)</Label>
              <Input id="subtitleAr" dir="rtl" value={subtitleAr} onChange={(e) => setSubtitleAr(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ctaTextEn">Button 1 text (English)</Label>
              <Input id="ctaTextEn" placeholder="Shop Coffee" value={ctaTextEn} onChange={(e) => setCtaTextEn(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ctaTextAr">Button 1 text (Arabic)</Label>
              <Input id="ctaTextAr" dir="rtl" value={ctaTextAr} onChange={(e) => setCtaTextAr(e.target.value)} />
            </div>
          </div>
          <LinkPicker id="linkUrl" label="Button 1 link (optional)" value={linkUrl} onChange={setLinkUrl} products={products} allowAddToCart />

          {showSecondButton ? (
            <div className="space-y-4 rounded-xl border border-outline-variant/60 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-on-surface">Button 2</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowSecondButton(false);
                    setCtaText2En("");
                    setCtaText2Ar("");
                    setLink2Url("");
                  }}
                  className="text-xs font-semibold text-error hover:opacity-70"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ctaText2En">Button 2 text (English)</Label>
                  <Input id="ctaText2En" placeholder="Our Story" value={ctaText2En} onChange={(e) => setCtaText2En(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="ctaText2Ar">Button 2 text (Arabic)</Label>
                  <Input id="ctaText2Ar" dir="rtl" value={ctaText2Ar} onChange={(e) => setCtaText2Ar(e.target.value)} />
                </div>
              </div>
              <LinkPicker id="link2Url" label="Button 2 link (optional)" value={link2Url} onChange={setLink2Url} products={products} allowAddToCart />
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => setShowSecondButton(true)}>
              + Add a second button
            </Button>
          )}

          <Button type="button" onClick={addSlide} loading={pending}>
            Add hero slide
          </Button>
        </CardContent>
      </Card>

      {/* ── Hero slides ──────────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-lg font-bold text-on-surface">Hero slides</h2>
        <p className="mb-4 mt-0.5 text-sm text-on-surface-variant">
          Shown at the top of the homepage, in this order.
        </p>
        <div className="space-y-3">
          {items.map((slide, i) => (
            <div
              key={slide.id}
              className="flex items-center gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3"
            >
              <span className="w-6 shrink-0 text-center text-sm font-semibold text-on-surface-variant">{i + 1}</span>
              <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg">
                <NextImage src={slide.url} alt={slide.title ?? ""} fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-on-surface">{slide.title ?? "Default hero copy"}</p>
                <p className="text-xs text-on-surface-variant">{slide.isActive ? "Visible" : "Hidden"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => moveSlide(i, -1)}
                  disabled={pending || i === 0}
                  aria-label="Move up"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant text-on-surface disabled:opacity-30"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveSlide(i, 1)}
                  disabled={pending || i === items.length - 1}
                  aria-label="Move down"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant text-on-surface disabled:opacity-30"
                >
                  <ArrowDown size={14} />
                </button>
                <label className="ms-1 flex items-center gap-1 text-xs">
                  <input type="checkbox" defaultChecked={slide.isActive} onChange={(e) => toggleActive(slide.id, e.target.checked)} />
                  Active
                </label>
                <button type="button" onClick={() => remove(slide.id)} aria-label="Delete slide" className="ms-1 p-1 text-error hover:opacity-70">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="rounded-xl border border-dashed border-outline-variant/60 p-6 text-center text-sm text-on-surface-variant">
              No hero slides yet — the homepage shows the built-in default hero. Add a slide above to take control.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
