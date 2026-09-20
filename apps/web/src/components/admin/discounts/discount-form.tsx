"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { discountSchema, type DiscountInput } from "@verella/core";
import { createDiscountAction, updateDiscountAction } from "@/lib/discounts/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, FormError } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

function toDatetimeLocal(d?: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function DiscountForm({
  discountId,
  products,
  categories,
  defaultValues,
}: {
  discountId?: number;
  products: { id: number; name: string }[];
  categories: { id: number; name: string }[];
  defaultValues?: Partial<DiscountInput>;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DiscountInput>({
    resolver: zodResolver(discountSchema) as unknown as Resolver<DiscountInput>,
    defaultValues: {
      name: defaultValues?.name ?? "",
      type: defaultValues?.type ?? "percent",
      value: defaultValues?.value ?? "10.00",
      scope: defaultValues?.scope ?? "all",
      code: defaultValues?.code ?? "",
      minOrderTotal: defaultValues?.minOrderTotal ?? null,
      maxUses: defaultValues?.maxUses ?? null,
      perUserLimit: defaultValues?.perUserLimit ?? null,
      // startsAt/endsAt deliberately omitted here — seeded only via the <Input
      // defaultValue> below as a "YYYY-MM-DDTHH:mm" string. If RHF's
      // defaultValues held a Date object instead, its ref-registration step
      // would stringify it with String(date) and clobber the datetime-local
      // input's displayed value on mount.
      isActive: defaultValues?.isActive ?? true,
      productIds: defaultValues?.productIds ?? [],
      categoryIds: defaultValues?.categoryIds ?? [],
    },
  });

  const scope = watch("scope");
  // Automatic = no code: the discount just applies and shows on the product
  // itself (price + strikethrough), rather than requiring the shopper to type
  // a code at checkout.
  const [isAutomatic, setIsAutomatic] = useState(!defaultValues?.code);

  async function onSubmit(values: DiscountInput) {
    setServerError(null);
    const result = discountId ? await updateDiscountAction(discountId, values) : await createDiscountAction(values);
    if ("error" in result) {
      setServerError(result.error);
      toast(result.error, "error");
      return;
    }
    toast(discountId ? "Discount updated." : "Discount created.");
    router.push("/admin/discounts");
    router.refresh();
  }

  // Surfaces validation failures on any field, including ones without their
  // own inline message below — otherwise a bad value on e.g. Type, Starts,
  // or Max uses blocks submission with zero visible feedback.
  const errorMessages = Object.values(errors)
    .map((e) => (e && typeof e === "object" && "message" in e ? (e.message as string | undefined) : undefined))
    .filter((m): m is string => !!m);

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <FormError>{serverError}</FormError>
          {errorMessages.length > 0 && (
            <div className="rounded-xl border border-error/30 bg-error/5 p-3 text-xs text-error">
              <p className="font-semibold">Please fix the following:</p>
              <ul className="mt-1 list-disc space-y-0.5 ps-4">
                {errorMessages.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Ramadan Sale" {...register("name")} />
            {errors.name && <p className="mt-1 text-xs text-error">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                {...register("type")}
                className="flex h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface"
              >
                <option value="percent">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </div>
            <div>
              <Label htmlFor="value">Value</Label>
              <Input id="value" type="number" step="0.01" {...register("value")} />
              {errors.value && <p className="mt-1 text-xs text-error">{errors.value.message}</p>}
            </div>
            {!isAutomatic && (
              <div>
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  placeholder="RAMADAN25"
                  {...register("code", {
                    onChange: (e) => {
                      const upper = e.target.value.toUpperCase();
                      if (upper !== e.target.value) e.target.value = upper;
                    },
                  })}
                />
                {errors.code && <p className="mt-1 text-xs text-error">{errors.code.message}</p>}
              </div>
            )}
          </div>

          <label className="flex items-start gap-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={isAutomatic}
              onChange={(e) => {
                setIsAutomatic(e.target.checked);
                if (e.target.checked) setValue("code", "");
              }}
              className="mt-0.5 h-4 w-4 rounded border-outline-variant"
            />
            <span>
              <span className="block font-semibold">Automatic offer — no code needed</span>
              <span className="block text-xs text-on-surface-variant">
                Applies to matching products automatically — the discounted price and a struck-through original price
                show right on the product, and shoppers don&apos;t need to enter anything at checkout. Turn this off to
                require a code instead.
              </span>
            </span>
          </label>

          <div>
            <Label htmlFor="scope">Applies to</Label>
            <select
              id="scope"
              {...register("scope")}
              className="flex h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface"
            >
              <option value="all">All products</option>
              <option value="category">Specific categories</option>
              <option value="product">Specific products</option>
            </select>
          </div>

          {scope === "category" && (
            <div>
              <Label>Categories</Label>
              <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-outline-variant p-3 sm:grid-cols-2">
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      value={c.id}
                      defaultChecked={defaultValues?.categoryIds?.includes(c.id)}
                      {...register("categoryIds")}
                      className="h-4 w-4 rounded border-outline-variant"
                    />
                    {c.name}
                  </label>
                ))}
              </div>
              {errors.categoryIds && <p className="mt-1 text-xs text-error">{errors.categoryIds.message}</p>}
            </div>
          )}

          {scope === "product" && (
            <div>
              <Label>Products</Label>
              <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-outline-variant p-3 sm:grid-cols-2">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      value={p.id}
                      defaultChecked={defaultValues?.productIds?.includes(p.id)}
                      {...register("productIds")}
                      className="h-4 w-4 rounded border-outline-variant"
                    />
                    {p.name}
                  </label>
                ))}
              </div>
              {errors.productIds && <p className="mt-1 text-xs text-error">{errors.productIds.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="startsAt">Starts</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                defaultValue={toDatetimeLocal(defaultValues?.startsAt ?? new Date())}
                {...register("startsAt")}
              />
            </div>
            <div>
              <Label htmlFor="endsAt">Ends</Label>
              <Input
                id="endsAt"
                type="datetime-local"
                defaultValue={toDatetimeLocal(defaultValues?.endsAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))}
                {...register("endsAt")}
              />
              {errors.endsAt && <p className="mt-1 text-xs text-error">{errors.endsAt.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="minOrderTotal">Min. order total</Label>
              <Input id="minOrderTotal" type="number" step="0.01" {...register("minOrderTotal")} />
            </div>
            <div>
              <Label htmlFor="maxUses">Max total uses</Label>
              <Input id="maxUses" type="number" {...register("maxUses")} />
            </div>
            <div>
              <Label htmlFor="perUserLimit">Max uses per customer</Label>
              <Input id="perUserLimit" type="number" {...register("perUserLimit")} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input type="checkbox" {...register("isActive")} className="h-4 w-4 rounded border-outline-variant" />
            Active
          </label>

          <div className="flex gap-3">
            <Button type="submit" loading={isSubmitting}>
              {discountId ? "Save changes" : "Create discount"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/admin/discounts")}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
