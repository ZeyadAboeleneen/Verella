"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Trash2, X } from "lucide-react";
import { createBranchAction, updateBranchAction, deleteBranchAction, type BranchInput } from "@/lib/branches/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, FormError } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

export interface BranchItem {
  id: number;
  name: string;
  nameAr: string | null;
  address: string | null;
  addressAr: string | null;
  hours: string | null;
  mapUrl: string | null;
}

function BranchForm({
  initial,
  pending,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: BranchItem;
  pending: boolean;
  onSubmit: (input: BranchInput) => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  return (
    <form
      action={(formData) =>
        onSubmit({
          name: String(formData.get("name") ?? ""),
          nameAr: String(formData.get("nameAr") ?? ""),
          address: String(formData.get("address") ?? ""),
          addressAr: String(formData.get("addressAr") ?? ""),
          hours: String(formData.get("hours") ?? ""),
          mapUrl: String(formData.get("mapUrl") ?? ""),
        })
      }
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Branch name (English)</Label>
          <Input id="name" name="name" defaultValue={initial?.name} required />
        </div>
        <div>
          <Label htmlFor="nameAr">Branch name (Arabic)</Label>
          <Input id="nameAr" name="nameAr" dir="rtl" defaultValue={initial?.nameAr ?? ""} placeholder="فرع المنصورة" />
        </div>
      </div>
      <div>
        <Label htmlFor="mapUrl">Google Maps link</Label>
        <Input id="mapUrl" name="mapUrl" type="url" defaultValue={initial?.mapUrl ?? ""} placeholder="https://maps.google.com/?q=…" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="address">Address (English, optional)</Label>
          <Input id="address" name="address" defaultValue={initial?.address ?? ""} placeholder="Taksem Khattab, Mansoura" />
        </div>
        <div>
          <Label htmlFor="addressAr">Address (Arabic, optional)</Label>
          <Input id="addressAr" name="addressAr" dir="rtl" defaultValue={initial?.addressAr ?? ""} placeholder="تقسيم خطاب، المنصورة" />
        </div>
      </div>
      <div>
        <Label htmlFor="hours">Hours (optional)</Label>
        <Input id="hours" name="hours" defaultValue={initial?.hours ?? ""} placeholder="Open Daily" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function BranchesManager({ items }: { items: BranchItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  function run(fn: () => Promise<{ error: string } | { success: true } | { success: true; data: unknown }>, successMsg: string) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if ("error" in res) {
        setError(res.error);
        toast(res.error, "error");
      } else {
        toast(successMsg);
        setEditingId(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        <FormError>{error}</FormError>
        {items.map((b) =>
          editingId === b.id ? (
            <Card key={b.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Edit branch</CardTitle>
                <button type="button" onClick={() => setEditingId(null)} aria-label="Close editor" className="text-on-surface-variant">
                  <X size={16} />
                </button>
              </CardHeader>
              <CardContent>
                <BranchForm
                  initial={b}
                  pending={pending}
                  submitLabel="Save branch"
                  onCancel={() => setEditingId(null)}
                  onSubmit={(input) => run(() => updateBranchAction(b.id, input), "Branch updated.")}
                />
              </CardContent>
            </Card>
          ) : (
            <div
              key={b.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-on-surface">
                  {b.name}
                  {b.nameAr && <span dir="rtl" className="ms-2 font-normal text-on-surface-variant">{b.nameAr}</span>}
                </p>
                <p className="mt-0.5 text-sm text-on-surface-variant">
                  {[b.address, b.hours].filter(Boolean).join(" · ") || "No address / hours set"}
                </p>
                {b.mapUrl && (
                  <a
                    href={b.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <MapPin size={12} /> Maps link
                  </a>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingId(b.id)}
                  aria-label={`Edit ${b.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant text-on-surface hover:bg-surface-container"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`Delete branch "${b.name}"?`)) run(() => deleteBranchAction(b.id), "Branch deleted.");
                  }}
                  aria-label={`Delete ${b.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant text-error hover:bg-error-container/40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ),
        )}
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-outline-variant/60 p-6 text-center text-sm text-on-surface-variant">
            No branches yet — add your first one.
          </p>
        )}
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Add branch</CardTitle>
        </CardHeader>
        <CardContent>
          <BranchForm pending={pending} submitLabel="Add branch" onSubmit={(input) => run(() => createBranchAction(input), "Branch added.")} />
        </CardContent>
      </Card>
    </div>
  );
}
