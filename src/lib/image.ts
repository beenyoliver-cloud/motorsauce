// src/lib/image.ts
import { listings } from "@/data/listings";

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

  // 2) look up in listings by id
  const lookupId = (it.listingId ?? it.id) as string | number | undefined;
  if (lookupId != null) {
    const match = listings.find((l) => String(l.id) === String(lookupId));
    if (match) {
      if (match.image && String(match.image).trim()) return String(match.image);
      if (Array.isArray((match as any).images) && (match as any).images.length) {
        const first = (match as any).images[0];
        if (first) return String(first);
      }
    }
  }

  // 3) final fallback
  return "/images/placeholder.png";
}
