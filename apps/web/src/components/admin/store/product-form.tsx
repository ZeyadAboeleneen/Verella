"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { storeProductSchema, type StoreProductInput } from "@verella/core";
import { createStoreProductAction, updateStoreProductAction } from "@/lib/store/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, FormError } from "@/components/ui/card";
import { MediaGalleryPicker } from "@/components/admin/media-gallery-picker";
import type { PickedMedia } from "@/components/admin/media-picker";
import { toast } from "@/components/ui/toast";

export function StoreProductForm({
  productId,
  categories,
  defaultValues,
}: {
  productId?: number;
  categories: { id: number; name: string }[];
  defaultValues?: Partial<StoreProductInput> & { images?: PickedMedia[] };
}) {
  const router = useRouter();
  const [images, setImages] = useState<PickedMedia[]>(defaultValues?.images ?? []);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StoreProductInput>({
    resolver: zodResolver(storeProductSchema) as unknown as Resolver<StoreProductInput>,
    defaultValues: {
      categoryId: defaultValues?.categoryId ?? categories[0]?.id,
      slug: defaultValues?.slug ?? "",
      sku: defaultValues?.sku ?? "",
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

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <FormError>{serverError}</FormError>

          <MediaGalleryPicker value={images} onChange={setImages} />

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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
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
              <Label htmlFor="price">Price (EGP)</Label>
              <Input id="price" type="number" step="0.01" {...register("price")} />
              {errors.price && <p className="mt-1 text-xs text-error">{errors.price.message}</p>}
            </div>
            <div>
              <Label htmlFor="compareAtPrice">Compare-at price</Label>
              <Input id="compareAtPrice" type="number" step="0.01" {...register("compareAtPrice")} />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register("sku")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" placeholder="afandi-signature" {...register("slug")} />
              {errors.slug && <p className="mt-1 text-xs text-error">{errors.slug.message}</p>}
            </div>
            <div>
              <Label htmlFor="stockQty">Stock quantity</Label>
              <Input id="stockQty" type="number" {...register("stockQty", { valueAsNumber: true })} />
            </div>
            <div>
              <Label htmlFor="sortOrder">Display order</Label>
              <Input id="sortOrder" type="number" {...register("sortOrder", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-on-surface">
              <input type="checkbox" {...register("isActive")} className="h-4 w-4 rounded border-outline-variant" />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm text-on-surface">
              <input type="checkbox" {...register("isBestSeller")} className="h-4 w-4 rounded border-outline-variant" />
              Best seller
            </label>
          </div>

          <div className="flex gap-3">
            <Button type="submit" loading={isSubmitting}>
              {productId ? "Save changes" : "Create product"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/admin/store/products")}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
