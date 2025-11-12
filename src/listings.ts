// Lightweight compatibility module to satisfy optional dev imports of `@/listings`.
// Exports a getAllListings helper and default empty array. The real source of truth
// is Supabase via /api/listings.

import defaultListings, { type Listing } from "./data/listings";

// for compatibility with dynamic imports that expect `.listings` or `.default`
export const listings = defaultListings;

export async function getAllListings(): Promise<Listing[]> {
  return defaultListings;
}

export default defaultListings;
