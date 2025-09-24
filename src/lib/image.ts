// src/lib/image.ts
export async function primaryImageForListing(id: string): Promise<string> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "";
    const res = await fetch(`${base}/api/listings?id=${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (!res.ok) return "/images/placeholder.png";
    const l = await res.json();
    return l?.image || "/images/placeholder.png";
  } catch {
    return "/images/placeholder.png";
  }
}
