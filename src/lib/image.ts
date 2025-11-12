// src/lib/image.ts

type AnyItem = {
  id?: string | number;
  image?: string;
  images?: string[];
  listingId?: string | number;
  listingImage?: string;
};

export function resolveListingImage(it: AnyItem): string {
  // 1) explicit fields on the object (like the offers popup uses)
  if (it.listingImage && String(it.listingImage).trim()) return String(it.listingImage);
  if (it.image && String(it.image).trim()) return String(it.image);
  if (Array.isArray(it.images) && it.images.length && String(it.images[0]).trim()) return String(it.images[0]);

  // 2) (no synchronous DB lookup available) final fallback
  // If you need server-backed images in UI places, consider calling
  // `getListingById` from `@/lib/listingsService` where you can `await`.

  // 3) final fallback
  return "/images/placeholder.png";
}
