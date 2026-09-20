"use client";

import { useRef, useState, useTransition } from "react";
import NextImage from "next/image";
import { Upload, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { presignMediaUploadAction, confirmMediaUploadAction, deleteMediaAction } from "@/lib/media/actions";

export interface MediaItem {
  id: number;
  url: string | null;
  alt: string | null;
  title: string | null;
  isPrivate: boolean;
  mime: string;
}

export function MediaLibrary({ initialItems }: { initialItems: MediaItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      const presign = await presignMediaUploadAction({
        filename: file.name,
        mime: file.type,
        sizeBytes: file.size,
        folder: "library",
        isPrivate: false,
      });
      if ("error" in presign) {
        setError(presign.error);
        continue;
      }

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", presign.apiKey);
      form.append("timestamp", String(presign.timestamp));
      form.append("signature", presign.signature);
      form.append("folder", presign.folder);
      form.append("type", presign.type);
      const uploadRes = await fetch(presign.uploadUrl, { method: "POST", body: form });
      const uploaded = await uploadRes.json();
      if (!uploadRes.ok) {
        setError(`Upload failed for ${file.name}.`);
        continue;
      }

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
      if ("error" in confirmed) {
        setError(confirmed.error);
        continue;
      }

      setItems((prev) => [
        { id: confirmed.id, url: confirmed.url, alt: file.name, title: file.name, isPrivate: false, mime: file.type },
        ...prev,
      ]);
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      const res = await deleteMediaAction(id);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload size={16} />
          {uploading ? "Uploading…" : "Upload images"}
        </Button>
        {error && <p className="text-sm text-error">{error}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative aspect-square overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container"
          >
            {item.isPrivate ? (
              <div className="flex h-full items-center justify-center text-on-surface-variant">
                <Lock size={20} />
              </div>
            ) : item.url ? (
              <NextImage src={item.url} alt={item.alt ?? ""} fill className="object-cover" />
            ) : null}
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              disabled={isPending}
              className="absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="col-span-full text-sm text-on-surface-variant">No media uploaded yet.</p>}
      </div>
    </div>
  );
}
