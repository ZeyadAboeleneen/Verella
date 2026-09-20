"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MediaPicker, type PickedMedia } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, FormError } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { LinkPicker } from "@/components/admin/content/link-picker";
import { saveCategoryCardAction } from "@/lib/content/actions";
import type { CategoryCardKey, CategoryCardPayload } from "@/lib/content/queries";

export interface CategoryCardItem {
  key: CategoryCardKey;
  label: string;
  current: CategoryCardPayload;
}

function CardEditor({ item }: { item: CategoryCardItem }) {
  const router = useRouter();
  const { current } = item;
  const [image, setImage] = useState<PickedMedia | null>({ id: current.mediaId, url: current.imageUrl });
  const [titleEn, setTitleEn] = useState(current.titleEn);
  const [titleAr, setTitleAr] = useState(current.titleAr);
  const [descriptionEn, setDescriptionEn] = useState(current.descriptionEn);
  const [descriptionAr, setDescriptionAr] = useState(current.descriptionAr);
  const [linkUrl, setLinkUrl] = useState(current.linkUrl);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (!image) {
      setError("Choose an image first.");
      return;
    }
    if (!titleEn.trim()) {
      setError("An English title is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await saveCategoryCardAction(item.key, {
        mediaId: image.id,
        imageUrl: image.url,
        titleEn,
        titleAr,
        descriptionEn,
        descriptionAr,
        linkUrl,
      });
      if ("error" in res) {
        setError(res.error);
        toast(res.error, "error");
      } else {
        toast(`${item.label} updated.`);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{item.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormError>{error}</FormError>
        <MediaPicker value={image} onChange={setImage} label="Card image" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${item.key}-titleEn`}>Title (English)</Label>
            <Input id={`${item.key}-titleEn`} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`${item.key}-titleAr`}>Title (Arabic)</Label>
            <Input id={`${item.key}-titleAr`} dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${item.key}-descEn`}>Description (English)</Label>
            <Input id={`${item.key}-descEn`} value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`${item.key}-descAr`}>Description (Arabic)</Label>
            <Input id={`${item.key}-descAr`} dir="rtl" value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} />
          </div>
        </div>
        <LinkPicker id={`${item.key}-link`} label="Links to" value={linkUrl} onChange={setLinkUrl} />
        <Button type="button" onClick={save} loading={pending}>
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

export function CategoryCardsManager({ items }: { items: CategoryCardItem[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {items.map((item) => (
        <CardEditor key={item.key} item={item} />
      ))}
    </div>
  );
}
