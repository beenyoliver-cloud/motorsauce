// src/lib/localDb.ts
import fs from "fs/promises";
import path from "path";

export type Listing = {
  id: string;
  title: string;
  price: string; // e.g., "£120" or "£49.99"
  image: string; // main image url (e.g., /uploads/xxxx.jpg)
  images?: string[];
  category: "OEM" | "Aftermarket" | "Tool";
  condition: "New" | "Used - Like New" | "Used - Good" | "Used - Fair";
  make?: string;
  model?: string;
  genCode?: string;
  engine?: string;
  year?: number;
  oem?: string;
  description?: string;
  createdAt: string;
  seller: {
    name: string;
    avatar: string;
    rating: number;
  };
  vin?: string;
  yearFrom?: number;
  yearTo?: number;

  // NEW: who owns this listing locally
  ownerId?: string;
};

const DB_PATH = path.join(process.cwd(), "src", "data", "local.listings.json");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

async function ensureDbFile() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, "[]", "utf8");
  }
}

export async function readLocalListings(): Promise<Listing[]> {
  await ensureDbFile();
  const raw = await fs.readFile(DB_PATH, "utf8");
  try {
    return JSON.parse(raw) as Listing[];
  } catch {
    return [];
  }
}

export async function writeLocalListings(all: Listing[]) {
  await ensureDbFile();
  await fs.writeFile(DB_PATH, JSON.stringify(all, null, 2), "utf8");
}

export async function addLocalListing(item: Listing): Promise<Listing> {
  const all = await readLocalListings();
  all.unshift(item); // newest first
  await writeLocalListings(all);
  return item;
}
