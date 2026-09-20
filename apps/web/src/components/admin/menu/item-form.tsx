"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { menuItemSchema, MENU_ITEM_SIZE_OPTIONS, type MenuItemInput } from "@verella/core";
import { createMenuItemAction, updateMenuItemAction } from "@/lib/menu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, FormError } from "@/components/ui/card";
import { MediaPicker, type PickedMedia } from "@/components/admin/media-picker";
import { toast } from "@/components/ui/toast";

export function MenuItemForm({
  itemId,
  categories,
  defaultValues,
}: {
  itemId?: number;
  categories: { id: number; name: string }[];
  defaultValues?: Partial<MenuItemInput> & { image?: PickedMedia | null };
}) {
  const router = useRouter();
  const [image, setImage] = useState<PickedMedia | null>(defaultValues?.image ?? null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MenuItemInput>({
    // Cast: zodResolver's inferred input type diverges from the output type
    // for schemas using z.coerce (sortOrder, size prices) — runtime validation
    // is correct, this just pins the TS generic to the resolved (output) shape.
    resolver: zodResolver(menuItemSchema) as unknown as Resolver<MenuItemInput>,
    defaultValues: {
      categoryId: defaultValues?.categoryId ?? categories[0]?.id,
      slug: defaultValues?.slug ?? "",
      sizes: defaultValues?.sizes?.length ? defaultValues.sizes : [{ size: "Single", price: "0.00", sortOrder: 0 }],
      badge: defaultValues?.badge ?? "",
      isFeatured: defaultValues?.isFeatured ?? false,
      isNew: defaultValues?.isNew ?? false,
      isActive: defaultValues?.isActive ?? true,
      sortOrder: defaultValues?.sortOrder ?? 0,
      name: defaultValues?.name ?? { en: "", ar: "" },
      description: defaultValues?.description ?? { en: "", ar: "" },
      notes: defaultValues?.notes ?? { en: "", ar: "" },
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "sizes" });
  const watchedSizes = useWatch({ control, name: "sizes" });
  const usedSizeLabels = new Set((watchedSizes ?? []).map((s) => s?.size).filter(Boolean));

  async function onSubmit(values: MenuItemInput) {
    setServerError(null);
    const payload = { ...values, imageMediaId: image?.id ?? null };
    const result = itemId ? await updateMenuItemAction(itemId, payload) : await createMenuItemAction(payload);

    if ("error" in result) {
      setServerError(result.error);
      toast(result.error, "error");
      return;
    }
    toast(itemId ? "Item updated." : "Item created.");
    router.push("/admin/menu/items");
    router.refresh();
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <FormError>{serverError}</FormError>

          <MediaPicker value={image} onChange={setImage} label="Item image (optional)" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name.en">Name (English)</Label>
              <Input id="name.en" {...register("name.en")} />
              {errors.name?.en && <p className="mt-1 text-xs text-error">{errors.name.en.message}</p>}
            </div>
            <div>
              <Label htmlFor="name.ar">Name (Arabic)</Label>
              <Input id="name.ar" dir="rtl" {...register("name.ar")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="description.en">Description (English)</Label>
              <Input id="description.en" {...register("description.en")} />
            </div>
            <div>
              <Label htmlFor="description.ar">Description (Arabic)</Label>
              <Input id="description.ar" dir="rtl" {...register("description.ar")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <Label htmlFor="categoryId">Category</Label>
              <select
                id="categoryId"
                {...register("categoryId", { valueAsNumber: true })}
                className="flex h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" placeholder="turkish-coffee" {...register("slug")} />
              {errors.slug && <p className="mt-1 text-xs text-error">{errors.slug.message}</p>}
            </div>
            <div>
              <Label htmlFor="sortOrder">Display order</Label>
              <Input id="sortOrder" type="number" {...register("sortOrder", { valueAsNumber: true })} />
            </div>
          </div>

          {/* ── Sizes & pricing ──────────────────────────────────────────── */}
          <div>
            <Label>Sizes & pricing</Label>
            <div className="mt-2 space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input placeholder="Size (e.g. Medium)" {...register(`sizes.${index}.size` as const)} />
                    {errors.sizes?.[index]?.size && (
                      <p className="mt-1 text-xs text-error">{errors.sizes[index]?.size?.message}</p>
                    )}
                  </div>
                  <div className="w-32">
                    <Input type="number" step="0.01" placeholder="Price" {...register(`sizes.${index}.price` as const)} />
                    {errors.sizes?.[index]?.price && (
                      <p className="mt-1 text-xs text-error">{errors.sizes[index]?.price?.message}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                    aria-label="Remove size"
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            {typeof errors.sizes?.message === "string" && (
              <p className="mt-1 text-xs text-error">{errors.sizes.message}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {MENU_ITEM_SIZE_OPTIONS.filter((s) => !usedSizeLabels.has(s)).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => append({ size: s, price: "0.00", sortOrder: fields.length })}
                  className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
                >
                  + {s}
                </button>
              ))}
              <button
                type="button"
                onClick={() => append({ size: "", price: "0.00", sortOrder: fields.length })}
                className="rounded-full border border-dashed border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
              >
                + Custom size
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="badge">Badge (optional)</Label>
            <Input id="badge" placeholder="Popular / Heritage / Seasonal" {...register("badge")} />
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-on-surface">
              <input type="checkbox" {...register("isActive")} className="h-4 w-4 rounded border-outline-variant" />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm text-on-surface">
              <input type="checkbox" {...register("isNew")} className="h-4 w-4 rounded border-outline-variant" />
              New item
            </label>
          </div>

          <div className="flex gap-3">
            <Button type="submit" loading={isSubmitting}>
              {itemId ? "Save changes" : "Create item"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/admin/menu/items")}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
