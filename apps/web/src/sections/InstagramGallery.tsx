import Image from "next/image";
import { getDict } from "@/lib/i18n";
import { getInstagramPhotos, INSTAGRAM_PHOTO_KEYS, type InstagramPhotoPayload } from "@/lib/content/queries";
import { DEFAULT_INSTAGRAM_PHOTOS } from "@/lib/content/defaults";

export default async function InstagramGallery() {
  const [dict, saved] = await Promise.all([
    getDict(),
    getInstagramPhotos().catch(() => ({}) as Record<string, InstagramPhotoPayload>),
  ]);
  const photos = INSTAGRAM_PHOTO_KEYS.map((key) => saved[key] ?? DEFAULT_INSTAGRAM_PHOTOS[key]);

  return (
    <section className="py-12 md:py-20 px-5 md:px-16 max-w-[1280px] mx-auto">
      <div className="text-center mb-8 md:mb-12 space-y-1">
        <h2 className="font-[family-name:var(--font-plus-jakarta)] text-2xl md:text-[32px] font-semibold text-black">
          {dict.home.instagram.title}
        </h2>
        <p className="text-[#57392D] text-sm font-semibold">{dict.home.instagram.followUs}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {photos.map((photo, i) => {
          const tile = (
            <div className="aspect-square overflow-hidden rounded-2xl group relative bg-[#FCE8CD]">
              <Image
                src={photo.imageUrl}
                alt=""
                fill
                className="object-cover transition-all duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                <span aria-hidden="true" className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  favorite
                </span>
              </div>
            </div>
          );
          return photo.linkUrl ? (
            <a key={i} href={photo.linkUrl} target="_blank" rel="noopener noreferrer" className="block cursor-pointer">
              {tile}
            </a>
          ) : (
            <div key={i} className="cursor-pointer">
              {tile}
            </div>
          );
        })}
      </div>
    </section>
  );
}
