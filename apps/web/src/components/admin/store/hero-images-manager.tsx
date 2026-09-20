"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { Trash2, Plus } from "lucide-react";
import { MediaPicker, type PickedMedia } from "@/components/admin/media-picker";
import { createStoreHeroImageAction, toggleStoreHeroImageAction, deleteStoreHeroImageAction } from "@/lib/store/actions";
import { toast } from "@/components/ui/toast";

interface HeroItem {
  id: number;
  isActive: boolean;
  url: string;
}

export function HeroImagesManager({ items, nextSortOrder }: { items: HeroItem[]; nextSortOrder: number }) {
  const router = useRouter();
  const [picked, setPicked] = useState<PickedMedia | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function addImage(m: PickedMedia | null) {
    if (!m) return;
    startTransition(async () => {
      const res = await createStoreHeroImageAction({ mediaId: m.id, sortOrder: nextSortOrder, isActive: true });
      if ("error" in res) {
        setError(res.error);
        toast(res.error, "error");
      } else {
        toast("Hero image added.");
        router.refresh();
      }
      setPicked(null);
    });
  }

  return (
    <div>
      <div className="mb-4">
        <MediaPicker value={picked} onChange={addImage} label="Add a hero image" />
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-lowest">
            <div className="relative aspect-video">
              <NextImage src={item.url} alt="" fill className="object-cover" />
            </div>
            <div className="flex items-center justify-between p-3">
              <label className="flex items-center gap-2 text-xs text-on-surface">
                <input
                  type="checkbox"
                  defaultChecked={item.isActive}
                  disabled={pending}
                  onChange={(e) =>
                    startTransition(async () => {
                      await toggleStoreHeroImageAction(item.id, e.target.checked);
                      router.refresh();
                    })
                  }
                  className="h-4 w-4 rounded border-outline-variant"
                />
                Active
              </label>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteStoreHeroImageAction(item.id);
                    toast("Hero image removed.");
                    router.refresh();
                  })
                }
                className="text-error hover:opacity-70"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="col-span-full flex items-center gap-2 text-sm text-on-surface-variant">
            <Plus size={14} /> No hero images yet — add one above.
          </p>
        )}
      </div>
    </div>
  );
}
