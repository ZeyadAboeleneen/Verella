"use client";

import { useState } from "react";
import NextImage from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { ImageOff, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listPublicMediaAction, presignMediaUploadAction, confirmMediaUploadAction } from "@/lib/media/actions";

export interface PickedMedia {
  id: number;
  url: string;
}

export function MediaPicker({
  value,
  onChange,
  label = "Image",
}: {
  value: PickedMedia | null;
  onChange: (media: PickedMedia | null) => void;
  label?: string;
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
        if ("id" in confirmed) {
          onChange({ id: confirmed.id, url: confirmed.url });
          setOpen(false);
        }
      }
    }
    setUploading(false);
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-on-surface">{label}</p>
      <div className="flex items-center gap-3">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container">
          {value ? (
            <NextImage src={value.url} alt="" width={80} height={80} className="h-full w-full object-cover" />
          ) : (
            <ImageOff size={20} className="text-on-surface-variant" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" size="sm" onClick={openAndLoad}>
            Choose image
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              Remove
            </Button>
          )}
        </div>
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[80vh] w-[90vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-surface-container-lowest p-6">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="font-display text-lg font-bold text-on-surface">Choose image</Dialog.Title>
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
                disabled={uploading}
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
            </label>

            {loading ? (
              <p className="text-sm text-on-surface-variant">Loading…</p>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange({ id: item.id, url: item.url });
                      setOpen(false);
                    }}
                    className="aspect-square overflow-hidden rounded-lg border border-outline-variant/60 hover:ring-2 hover:ring-primary"
                  >
                    <NextImage
                      src={item.url}
                      alt={item.alt ?? ""}
                      width={120}
                      height={120}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
                {items.length === 0 && <p className="col-span-4 text-sm text-on-surface-variant">No media yet.</p>}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
