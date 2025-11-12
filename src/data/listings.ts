// src/data/listings.ts
// Sample listings file intentionally emptied to remove fake parts from the repository.
// Keep a private seed file outside of source control for local development if needed.

export type Listing = {
  id: string;
  title: string;
  price?: string | number;
  image?: string;
  images?: string[];
  category?: string;
  condition?: string;
  make?: string;
  model?: string;
  genCode?: string;
  engine?: string;
  year?: number;
  oem?: string;
  description?: string;
  createdAt?: string;
  seller?: { name: string; avatar?: string; rating?: number };
};

export const listings: Listing[] = [];

export default listings;
