"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { storeProductSchema, type StoreProductInput } from "@verella/core";
import { createStoreProductAction, updateStoreProductAction } from "@/lib/store/actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, FormError } from "@/components/ui/card";
import { MediaGalleryPicker } from "@/components/admin/media-gallery-picker";
import type { PickedMedia } from "@/components/admin/media-picker";
import { toast } from "@/components/ui/toast";

const AXIS_LABELS = { volume: "Volume (e.g. 50ml, 100ml)", size: "Size (e.g. S, M, L)", color: "Colour" } as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-5">
        <div>
          <h2 className="font-display text-base font-semibold text-on-surface">{title}</h2>
          {hint && <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

const selectClass =
  "flex h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30";

export function StoreProductForm({
  productId,
  categories,
  brands = [],
  defaultValues,
}: {
  productId?: number;
  categories: { id: number; name: string }[];
  /** Brands already in the catalog — offered as suggestions so spelling stays consistent. */
  brands?: string[];
  defaultValues?: Partial<StoreProductInput> & { images?: PickedMedia[] };
}) {
  const router = useRouter();
  const [images, setImages] = useState<PickedMedia[]>(defaultValues?.images ?? []);
  const [serverError, setServerError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(!!productId);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StoreProductInput>({
    resolver: zodResolver(storeProductSchema) as unknown as Resolver<StoreProductInput>,
    defaultValues: {
      categoryId: defaultValues?.categoryId ?? categories[0]?.id,
      slug: defaultValues?.slug ?? "",
      sku: defaultValues?.sku ?? "",
      brand: defaultValues?.brand ?? "",
      variantAxis: defaultValues?.variantAxis ?? "volume",
      variants: defaultValues?.variants ?? [],
      price: defaultValues?.price ?? "0.00",
      compareAtPrice: defaultValues?.compareAtPrice ?? null,
      isBestSeller: defaultValues?.isBestSeller ?? false,
      isFeaturedHome: defaultValues?.isFeaturedHome ?? false,
      isActive: defaultValues?.isActive ?? true,
      sortOrder: defaultValues?.sortOrder ?? 0,
      stockQty: defaultValues?.stockQty ?? 0,
      name: defaultValues?.name ?? { en: "", ar: "" },
      description: defaultValues?.description ?? { en: "", ar: "" },
      notes: defaultValues?.notes ?? { en: "", ar: "" },
      mediaIds: [],
    },
  });

  const { fields, append, remove, move } = useFieldArray({ control, name: "variants" });
  const hasVariants = fields.length > 0;
  const axis = watch("variantAxis");

  async function onSubmit(values: StoreProductInput) {
    setServerError(null);
    const payload = { ...values, mediaIds: images.map((img) => img.id) };
    const result = productId ? await updateStoreProductAction(productId, payload) : await createStoreProductAction(payload);

    if ("error" in result) {
      setServerError(result.error);
      toast(result.error, "error");
      return;
    }
    toast(productId ? "Product updated." : "Product created.");
    router.push("/admin/store/products");
    router.refresh();
  }

  function addVariant() {
    const last = watch("variants").at(-1);
    append({ label: "", labelAr: "", sku: "", price: last?.price ?? watch("price") ?? "0.00", compareAtPrice: null, stockQty: 0, isActive: true });
  }

  function toggleVariants(on: boolean) {
    if (on && fields.length === 0) {
      append({ label: "", labelAr: "", sku: "", price: watch("price") || "0.00", compareAtPrice: null, stockQty: watch("stockQty") ?? 0, isActive: true });
    }
    if (!on) {
      for (let i = fields.length - 1; i >= 0; i--) remove(i);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-5">
      <FormError>{serverError}</FormError>

      <Section title="Photos" hint="The first photo is the cover shown in the store.">
        <MediaGalleryPicker value={images} onChange={setImages} />
      </Section>

      <Section title="Product">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name.en">Name (English)</Label>
            <Input
              id="name.en"
              {...register("name.en", {
                onChange: (e) => {
                  if (!slugTouched) setValue("slug", slugify(e.target.value), { shouldValidate: true });
                },
              })}
            />
            {errors.name?.en && <p className="mt-1 text-xs text-error">{errors.name.en.message}</p>}
          </div>
          <div>
            <Label htmlFor="name.ar">Name (Arabic)</Label>
            <Input id="name.ar" dir="rtl" {...register("name.ar")} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" list="brand-options" autoComplete="off" placeholder="e.g. Lattafa" {...register("brand")} />
            <datalist id="brand-options">
              {brands.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>
          <div>
            <Label htmlFor="categoryId">Category</Label>
            <select id="categoryId" {...register("categoryId", { valueAsNumber: true })} className={selectClass}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="slug">URL slug</Label>
            <Input id="slug" placeholder="amber-oud" {...register("slug", { onChange: () => setSlugTouched(true) })} />
            {errors.slug && <p className="mt-1 text-xs text-error">{errors.slug.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="description.en">Description (English)</Label>
            <Textarea id="description.en" rows={4} {...register("description.en")} />
          </div>
          <div>
            <Label htmlFor="description.ar">Description (Arabic)</Label>
            <Textarea id="description.ar" dir="rtl" rows={4} {...register("description.ar")} />
          </div>
        </div>
      </Section>

      <Section
        title="Pricing & stock"
        hint={hasVariants ? "Each variant has its own price and stock. The store shows the cheapest one as the “from” price." : undefined}
      >
        <label className="flex items-center gap-3 text-sm text-on-surface">
          <input
            type="checkbox"
            checked={hasVariants}
            onChange={(e) => toggleVariants(e.target.checked)}
            className="h-4 w-4 rounded border-outline-variant accent-charcoal"
          />
          This product comes in sizes / variants
        </label>

        {!hasVariants ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <Label htmlFor="price">Price (EGP)</Label>
              <Input id="price" type="number" step="0.01" min="0" {...register("price")} />
              {errors.price && <p className="mt-1 text-xs text-error">{errors.price.message}</p>}
            </div>
            <div>
              <Label htmlFor="compareAtPrice">Compare-at price</Label>
              <Input id="compareAtPrice" type="number" step="0.01" min="0" {...register("compareAtPrice")} />
            </div>
            <div>
              <Label htmlFor="stockQty">Stock</Label>
              <Input id="stockQty" type="number" min="0" {...register("stockQty", { valueAsNumber: true })} />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register("sku")} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="max-w-xs">
              <Label htmlFor="variantAxis">Varies by</Label>
              <select id="variantAxis" {...register("variantAxis")} className={selectClass}>
                {(Object.keys(AXIS_LABELS) as (keyof typeof AXIS_LABELS)[]).map((a) => (
                  <option key={a} value={a}>
                    {AXIS_LABELS[a]}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto rounded-xl border border-outline-variant">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-surface-container-low text-left text-xs uppercase tracking-wider text-on-surface-variant">
                  <tr>
                    <th className="px-3 py-2 font-medium">Label</th>
                    <th className="px-3 py-2 font-medium">Arabic label</th>
                    <th className="px-3 py-2 font-medium">Price</th>
                    <th className="px-3 py-2 font-medium">Compare-at</th>
                    <th className="px-3 py-2 font-medium">Stock</th>
                    <th className="px-3 py-2 font-medium">SKU</th>
                    <th className="px-3 py-2 font-medium">On sale</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {fields.map((field, i) => (
                    <tr key={field.id} className="align-top">
                      <td className="px-2 py-2">
                        <input type="hidden" {...register(`variants.${i}.id`, { setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)) })} />
                        <Input className="h-9 px-2" placeholder={axis === "volume" ? "50ml" : axis === "size" ? "M" : "Black"} {...register(`variants.${i}.label`)} />
                        {errors.variants?.[i]?.label && <p className="mt-1 text-xs text-error">{errors.variants[i]?.label?.message}</p>}
                      </td>
                      <td className="px-2 py-2">
                        <Input className="h-9 px-2" dir="rtl" placeholder={axis === "volume" ? "—" : "وسط"} {...register(`variants.${i}.labelAr`)} />
                      </td>
                      <td className="px-2 py-2">
                        <Input className="h-9 w-24 px-2" type="number" step="0.01" min="0" {...register(`variants.${i}.price`)} />
                        {errors.variants?.[i]?.price && <p className="mt-1 text-xs text-error">{errors.variants[i]?.price?.message}</p>}
                      </td>
                      <td className="px-2 py-2">
                        <Input className="h-9 w-24 px-2" type="number" step="0.01" min="0" {...register(`variants.${i}.compareAtPrice`)} />
                      </td>
                      <td className="px-2 py-2">
                        <Input className="h-9 w-20 px-2" type="number" min="0" {...register(`variants.${i}.stockQty`, { valueAsNumber: true })} />
                      </td>
                      <td className="px-2 py-2">
                        <Input className="h-9 w-28 px-2" {...register(`variants.${i}.sku`)} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input type="checkbox" className="mt-2.5 h-4 w-4 accent-charcoal" {...register(`variants.${i}.isActive`)} />
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)} className="p-1.5 text-on-surface-variant hover:text-on-surface disabled:opacity-30">
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" aria-label="Move down" disabled={i === fields.length - 1} onClick={() => move(i, i + 1)} className="p-1.5 text-on-surface-variant hover:text-on-surface disabled:opacity-30">
                          <ArrowDown size={14} />
                        </button>
                        <button type="button" aria-label="Remove variant" onClick={() => remove(i)} className="p-1.5 text-error hover:opacity-70">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addVariant}>
              <Plus size={14} /> Add variant
            </Button>
            <p className="text-xs text-on-surface-variant">
              Arabic label is only needed when the label is a word (e.g. “Small”) — sizes like “50ml” read the same in both languages.
            </p>
          </div>
        )}
      </Section>

      <Section title="Visibility">
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input type="checkbox" {...register("isActive")} className="h-4 w-4 accent-charcoal" />
            Visible in store
          </label>
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input type="checkbox" {...register("isBestSeller")} className="h-4 w-4 accent-charcoal" />
            Best seller
          </label>
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input type="checkbox" {...register("isFeaturedHome")} className="h-4 w-4 accent-charcoal" />
            Feature on home page
          </label>
          <div className="flex items-center gap-2">
            <Label htmlFor="sortOrder" className="mb-0">
              Display order
            </Label>
            <Input id="sortOrder" type="number" className="h-9 w-20" {...register("sortOrder", { valueAsNumber: true })} />
          </div>
        </div>
      </Section>

      <div className="flex gap-3">
        <Button type="submit" loading={isSubmitting}>
          {productId ? "Save changes" : "Create product"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/store/products")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
