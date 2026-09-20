"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MediaPicker, type PickedMedia } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, FormError } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { saveAboutHeroAction } from "@/lib/content/actions";

export function AboutHeroManager({ initial }: { initial: PickedMedia | null }) {
  const router = useRouter();
  const [image, setImage] = useState<PickedMedia | null>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (!image) {
      setError("Choose an image first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await saveAboutHeroAction({ mediaId: image.id, imageUrl: image.url });
      if ("error" in res) {
        setError(res.error);
        toast(res.error, "error");
      } else {
        toast("About page hero updated.");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero image</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormError>{error}</FormError>
        <p className="text-sm text-on-surface-variant">
          Shown as the full-width background at the top of your public About page, behind the &quot;Our Story&quot;
          heading.
        </p>
        <MediaPicker value={image} onChange={setImage} label="Hero background image" />
        <Button type="button" onClick={save} loading={pending}>
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
