"use client";

import { useState } from "react";
import NextImage from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { ImageOff, Upload, X, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { listPublicMediaAction, presignMediaUploadAction, confirmMediaUploadAction } from "@/lib/media/actions";
import type { PickedMedia } from "./media-picker";

/**
 * Multi-image version of MediaPicker — order matters (first = primary product
 * image everywhere it's shown as a single thumbnail). Persisted as an ordered
 * mediaIds[] by product-form.tsx; store/actions.ts already writes sortOrder +
 * isPrimary from that array position.
 */
export function MediaGalleryPicker({
  value,
  onChange,
  label = "Product images",
  max = 10,
}: {
  value: PickedMedia[];
  onChange: (images: PickedMedia[]) => void;
  label?: string;
  max?: number;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ id: number; url: string; alt: string | null; title: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function openAndLoad() {
    setOpen(true);
    setLoading(true);
    const res = await listPublicMediaAction();
    if ("items" in res) setItems(res.items);
    setLoading(false);
  }

  function toggle(item: { id: number; url: string }) {
    const exists = value.some((v) => v.id === item.id);
    if (exists) {
      onChange(value.filter((v) => v.id !== item.id));
    } else if (value.length < max) {
      onChange([...value, { id: item.id, url: item.url }]);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    const presign = await presignMediaUploadAction({
      filename: file.name,
      mime: file.type,
      sizeBytes: file.size,
      folder: "library",
      isPrivate: false,
    });
    if ("uploadUrl" in presign) {
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", presign.apiKey);
      form.append("timestamp", String(presign.timestamp));
      form.append("signature", presign.signature);
      form.append("folder", presign.folder);
      form.append("type", presign.type);
      const upload = await fetch(presign.uploadUrl, { method: "POST", body: form });
      const uploaded = await upload.json();
      if (upload.ok) {
        const confirmed = await confirmMediaUploadAction({
          publicId: uploaded.public_id,
          format: uploaded.format,
          width: uploaded.width,
          height: uploaded.height,
          bytes: uploaded.bytes,
          title: file.name,
          folder: "library",
          isPrivate: false,
        });
        if ("id" in confirmed && value.length < max) {
          onChange([...value, { id: confirmed.id, url: confirmed.url }]);
        }
      }
    }
    setUploading(false);
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...value];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-on-surface">
        {label} <span className="font-normal text-on-surface-variant">— first image is the primary/cover photo</span>
      </p>

      <div className="flex flex-wrap gap-3">
        {value.map((img, i) => (
          <div key={img.id} className="group relative h-20 w-20 overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container">
            <NextImage src={img.url} alt="" width={80} height={80} className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute start-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary-container text-secondary" title="Primary image">
                <Star size={12} fill="currentColor" />
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-white disabled:opacity-30" title="Move earlier">
                <ChevronLeft size={16} />
              </button>
              <button type="button" onClick={() => remove(i)} className="text-white" title="Remove">
                <X size={16} />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} className="text-white disabled:opacity-30" title="Move later">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={openAndLoad}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-outline-variant text-on-surface-variant hover:bg-surface-container"
          >
            <ImageOff size={18} />
            <span className="text-[10px]">Add image</span>
          </button>
        )}
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[80vh] w-[90vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-surface-container-lowest p-6">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="font-display text-lg font-bold text-on-surface">Choose images ({value.length}/{max})</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="text-on-surface-variant">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>

            <label className="mb-4 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant text-sm text-on-surface-variant hover:bg-surface-container">
              <Upload size={16} />
              {uploading ? "Uploading…" : "Upload a new image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading || value.length >= max}
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
            </label>

            {loading ? (
              <p className="text-sm text-on-surface-variant">Loading…</p>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {items.map((item) => {
                  const selected = value.some((v) => v.id === item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggle(item)}
                      className={`relative aspect-square overflow-hidden rounded-lg border ${selected ? "border-primary ring-2 ring-primary" : "border-outline-variant/60"}`}
                    >
                      <NextImage src={item.url} alt={item.alt ?? ""} width={120} height={120} className="h-full w-full object-cover" />
                      {selected && <div className="absolute inset-0 bg-primary/20" />}
                    </button>
                  );
                })}
                {items.length === 0 && <p className="col-span-4 text-sm text-on-surface-variant">No media yet.</p>}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
