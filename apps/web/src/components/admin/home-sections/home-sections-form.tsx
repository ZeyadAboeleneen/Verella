"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { HomeFeature, HomeFeatureText } from "@/lib/home-sections/types";
import { saveHomeFeaturesAction } from "@/lib/home-sections/actions";
import { MediaPicker } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, FormError } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import type { LinkTarget } from "@/components/admin/offers/offer-form";

const emptyText: HomeFeatureText = { eyebrow: "", title: "", body: "", cta: "" };
const FIELDS: { key: keyof HomeFeatureText; label: string; multiline?: boolean }[] = [
  { key: "eyebrow", label: "Small heading" },
  { key: "title", label: "Title" },
  { key: "body", label: "Description", multiline: true },
  { key: "cta", label: "Button text" },
];
const textareaClass =
  "min-h-20 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-on-surface";

export function HomeSectionsForm({
  initial,
  categories,
  linkTargets,
}: {
  initial: HomeFeature[];
  categories: { slug: string; label: string; image: string | null }[];
  /** Pages, categories and products the button can open. */
  linkTargets: LinkTarget[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<HomeFeature[]>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (i: number, patch: Partial<HomeFeature>) => setItems((prev) => prev.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const setText = (i: number, lang: "ar" | "en", key: keyof HomeFeatureText, value: string) =>
    setItems((prev) => prev.map((f, j) => (j === i ? { ...f, [lang]: { ...f[lang], [key]: value } } : f)));
  const move = (i: number, by: -1 | 1) =>
    setItems((prev) => {
      const j = i + by;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  async function save() {
    setPending(true);
    setError(null);
    const res = await saveHomeFeaturesAction(items);
    setPending(false);
    if ("error" in res) {
      setError(res.error);
      toast(res.error, "error");
      return;
    }
    toast("Home sections saved.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {items.length === 0 && (
        <p className="rounded-xl border border-dashed border-outline-variant p-6 text-center text-sm text-on-surface-variant">
          No sections — the home page won&apos;t show any. Add one below.
        </p>
      )}

      {items.map((f, i) => {
        const category = categories.find((c) => c.slug === f.categorySlug);
        return (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>
                  Section {i + 1}
                  <span className="ms-2 text-xs font-normal text-on-surface-variant">
                    {i % 2 === 0 ? "picture on the left" : "picture on the right"}
                  </span>
                </CardTitle>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === items.length - 1}
                    aria-label="Move down"
                    className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                    aria-label="Delete section"
                    className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container hover:text-error"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-[1fr_260px]">
                <div>
                  <Label htmlFor={`cat-${i}`}>Category</Label>
                  <select
                    id={`cat-${i}`}
                    value={f.categorySlug}
                    onChange={(e) => update(i, { categorySlug: e.target.value })}
                    className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface"
                  >
                    <option value="">— Choose a category —</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  {f.categorySlug && !category && <p className="mt-1 text-xs text-error">This category no longer exists — choose another.</p>}
                  <div className="mt-4">
                    <Label htmlFor={`href-${i}`}>Button links to</Label>
                    <select
                      id={`href-${i}`}
                      value={f.href}
                      onChange={(e) => update(i, { href: e.target.value })}
                      className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface"
                    >
                      <option value="">The category above (default)</option>
                      {(["Pages", "Categories", "Products"] as const).map((group) => (
                        <optgroup key={group} label={group}>
                          {linkTargets
                            .filter((t) => t.group === group)
                            .map((t) => (
                              <option key={t.href} value={t.href}>
                                {t.label}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                      {f.href && !linkTargets.some((t) => t.href === f.href) && <option value={f.href}>{f.href}</option>}
                    </select>
                  </div>
                  <p className="mt-2 text-xs text-on-surface-variant">
                    Without its own picture, the section uses the category&apos;s image
                    {category && !category.image ? " (this category has none yet)" : ""}.
                  </p>
                </div>
                <div>
                  <MediaPicker
                    value={f.image}
                    onChange={(m) => update(i, { image: m ? { id: m.id, url: m.url } : null })}
                    label="Own picture (optional)"
                  />
                  {!f.image && category?.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={category.image} alt="" className="mt-2 h-24 w-full rounded-lg object-cover opacity-70" />
                  )}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {(["ar", "en"] as const).map((lang) => (
                  <div key={lang} className="space-y-3 rounded-xl border border-outline-variant/60 p-4" dir={lang === "ar" ? "rtl" : "ltr"}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{lang === "ar" ? "العربية" : "English"}</p>
                    {FIELDS.map((field) => (
                      <div key={field.key}>
                        <Label htmlFor={`${field.key}-${lang}-${i}`}>{field.label}</Label>
                        {field.multiline ? (
                          <textarea
                            id={`${field.key}-${lang}-${i}`}
                            value={f[lang][field.key]}
                            onChange={(e) => setText(i, lang, field.key, e.target.value)}
                            className={textareaClass}
                          />
                        ) : (
                          <Input
                            id={`${field.key}-${lang}-${i}`}
                            value={f[lang][field.key]}
                            onChange={(e) => setText(i, lang, field.key, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, { categorySlug: "", href: "", image: null, ar: { ...emptyText }, en: { ...emptyText } }])}
          disabled={items.length >= 10}
          className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-40"
        >
          <Plus size={15} /> Add section
        </button>
        <Button onClick={save} loading={pending}>
          Save
        </Button>
      </div>
      {error && <FormError>{error}</FormError>}
    </div>
  );
}
