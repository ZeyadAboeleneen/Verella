"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { menuCategorySchema, type MenuCategoryInput } from "@verella/core";
import { createMenuCategoryAction, updateMenuCategoryAction } from "@/lib/menu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, FormError } from "@/components/ui/card";
import { MediaPicker, type PickedMedia } from "@/components/admin/media-picker";
import { toast } from "@/components/ui/toast";

export function MenuCategoryForm({
  categoryId,
  defaultValues,
}: {
  categoryId?: number;
  defaultValues?: Partial<MenuCategoryInput> & { image?: PickedMedia | null };
}) {
  const router = useRouter();
  const [image, setImage] = useState<PickedMedia | null>(defaultValues?.image ?? null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MenuCategoryInput>({
    // Cast: zodResolver's inferred input type diverges from the output type
    // for schemas using z.coerce (sortOrder) — runtime validation is correct,
    // this just pins the TS generic to the resolved (output) shape.
    resolver: zodResolver(menuCategorySchema) as Resolver<MenuCategoryInput>,
    defaultValues: {
      slug: defaultValues?.slug ?? "",
      icon: defaultValues?.icon ?? "coffee",
      sortOrder: defaultValues?.sortOrder ?? 0,
      isActive: defaultValues?.isActive ?? true,
      name: defaultValues?.name ?? { en: "", ar: "" },
      description: defaultValues?.description ?? { en: "", ar: "" },
    },
  });

  async function onSubmit(values: MenuCategoryInput) {
    setServerError(null);
    const payload = { ...values, imageMediaId: image?.id ?? null };
    const result = categoryId
      ? await updateMenuCategoryAction(categoryId, payload)
      : await createMenuCategoryAction(payload);

    if ("error" in result) {
      setServerError(result.error);
      toast(result.error, "error");
      return;
    }
    toast(categoryId ? "Category updated." : "Category created.");
    router.push("/admin/menu");
    router.refresh();
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <FormError>{serverError}</FormError>

          <MediaPicker value={image} onChange={setImage} label="Category image" />

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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" placeholder="hot-drinks" {...register("slug")} />
              {errors.slug && <p className="mt-1 text-xs text-error">{errors.slug.message}</p>}
            </div>
            <div>
              <Label htmlFor="icon">Icon (Material Symbols)</Label>
              <Input id="icon" placeholder="local_cafe" {...register("icon")} />
            </div>
            <div>
              <Label htmlFor="sortOrder">Display order</Label>
              <Input id="sortOrder" type="number" {...register("sortOrder", { valueAsNumber: true })} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input type="checkbox" {...register("isActive")} className="h-4 w-4 rounded border-outline-variant" />
            Active (visible on the public menu)
          </label>

          <div className="flex gap-3">
            <Button type="submit" loading={isSubmitting}>
              {categoryId ? "Save changes" : "Create category"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/admin/menu")}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
