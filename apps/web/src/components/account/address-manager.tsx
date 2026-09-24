"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { addressSchema, governorateLabel, type AddressInput } from "@verella/core";
import { createAddressAction, updateAddressAction, deleteAddressAction } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GovernorateSelect } from "@/components/ui/governorate-select";
import { Card, CardContent, FormError } from "@/components/ui/card";

export interface AddressRow extends AddressInput {
  id: number;
}

export function AddressManager({ initialAddresses, locale = "en" }: { initialAddresses: AddressRow[]; locale?: "en" | "ar" }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [editing, setEditing] = useState<AddressRow | "new" | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function handleSaved(saved: AddressRow, isNew: boolean) {
    setAddresses((prev) => {
      const next = saved.isDefault ? prev.map((a) => ({ ...a, isDefault: false })) : prev;
      return isNew ? [saved, ...next] : next.map((a) => (a.id === saved.id ? saved : a));
    });
    setEditing(null);
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    const res = await deleteAddressAction(id);
    setDeletingId(null);
    if (!("error" in res)) setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  if (editing) {
    return (
      <AddressForm
        initial={editing === "new" ? null : editing}
        locale={locale}
        onCancel={() => setEditing(null)}
        onSaved={(saved) => handleSaved(saved, editing === "new")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => setEditing("new")}>
        <Plus size={16} /> Add address
      </Button>

      {addresses.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No saved addresses yet.</p>
      ) : (
        <div className="space-y-3">
          {addresses.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-on-surface">{a.recipientName}</p>
                    {a.isDefault && (
                      <span className="flex items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 text-xs text-on-secondary-container">
                        <Star size={10} fill="currentColor" /> Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-on-surface-variant">{a.phone}</p>
                  <p className="text-sm text-on-surface-variant">
                    {[a.street, a.building, a.area, a.city, governorateLabel(a.governorate, locale)].filter(Boolean).join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => setEditing(a)} className="text-on-surface-variant hover:text-primary" title="Edit">
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId === a.id}
                    className="text-on-surface-variant hover:text-error disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AddressForm({
  initial,
  locale,
  onCancel,
  onSaved,
}: {
  initial: AddressRow | null;
  locale: "en" | "ar";
  onCancel: () => void;
  onSaved: (row: AddressRow) => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema) as unknown as Resolver<AddressInput>,
    defaultValues: initial ?? { isDefault: false },
  });

  async function onSubmit(values: AddressInput) {
    setServerError(null);
    if (initial) {
      const result = await updateAddressAction(initial.id, values);
      if ("error" in result) {
        setServerError(result.error);
        return;
      }
      onSaved({ ...values, id: initial.id });
      return;
    }
    const result = await createAddressAction(values);
    if ("error" in result) {
      setServerError(result.error);
      return;
    }
    onSaved({ ...values, id: result.data.id });
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormError>{serverError}</FormError>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="recipientName">Recipient name</Label>
              <Input id="recipientName" {...register("recipientName")} />
              {errors.recipientName && <p className="mt-1 text-xs text-error">{errors.recipientName.message}</p>}
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
              {errors.phone && <p className="mt-1 text-xs text-error">{errors.phone.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="governorate">Governorate</Label>
              <GovernorateSelect id="governorate" locale={locale} defaultValue={initial?.governorate ?? ""} {...register("governorate")} />
              {errors.governorate && <p className="mt-1 text-xs text-error">{errors.governorate.message}</p>}
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} />
            </div>
            <div>
              <Label htmlFor="area">Area</Label>
              <Input id="area" {...register("area")} />
            </div>
          </div>
          <div>
            <Label htmlFor="street">Street</Label>
            <Input id="street" {...register("street")} />
            {errors.street && <p className="mt-1 text-xs text-error">{errors.street.message}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="building">Building</Label>
              <Input id="building" {...register("building")} />
            </div>
            <div>
              <Label htmlFor="floor">Floor</Label>
              <Input id="floor" {...register("floor")} />
            </div>
            <div>
              <Label htmlFor="apartment">Apartment</Label>
              <Input id="apartment" {...register("apartment")} />
            </div>
          </div>
          <div>
            <Label htmlFor="landmark">Landmark (optional)</Label>
            <Input id="landmark" {...register("landmark")} />
          </div>
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input type="checkbox" {...register("isDefault")} className="h-4 w-4 rounded border-outline-variant" />
            Set as default address
          </label>
          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save address"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
