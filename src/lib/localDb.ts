// src/lib/localDb.ts
// Previously this file wrote/read `src/data/local.listings.json` on disk.
// The app now uses Supabase for listings storage. Keep this module as
// a small compatibility shim that forwards calls to the Supabase-backed
// listings service.

import * as listingsService from './listingsService';

export type Listing = listingsService.Listing;

export async function readLocalListings(): Promise<Listing[]> {
  return listingsService.getListings();
}

export async function writeLocalListings(_: Listing[]) {
  // no-op: persisted in Supabase. If you need to bulk-write, use
  // listingsService.createListing / updateListing per-item.
  return;
}

export async function addLocalListing(item: Listing): Promise<Listing> {
  // create in Supabase and return created row
  return listingsService.createListing(item);
}

export async function ensureUploadsDir() {
  // not applicable on serverless; storage is handled via Supabase Storage
  return;
}
