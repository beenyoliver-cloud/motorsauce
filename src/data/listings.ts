// src/data/listings.ts
export type Listing = {
  id: string;
  title: string;
  price: string;
  image: string;
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
};

// --- Your original stable items (sample) ---
const baseListings: Listing[] = [
  {
    id: "L-0008",
    title: "Vauxhall Astra J Front Brake Pads (OEM)",
    price: "£120",
    image: "/images/brake-pads.jpg",
    images: ["/images/brake-pads.jpg"],
    category: "OEM",
    condition: "Used - Good",
    make: "Vauxhall",
    model: "Astra",
    genCode: "J",
    engine: "1.4T",
    year: 2018,
    oem: "13310065",
    description: "Genuine GM pads removed from low-mileage Astra J. Even wear, plenty of material.",
    createdAt: "2025-08-20T10:00:00.000Z",
    seller: { name: "AutoJoe", avatar: "/images/seller1.jpg", rating: 4.8 },
  },
  {
    id: "L-0007",
    title: 'Mercedes C-Class W205 18" Alloy Wheel Set (Aftermarket)',
    price: "£450",
    image: "/images/alloy-wheels.jpg",
    images: ["/images/alloy-wheels.jpg"],
    category: "Aftermarket",
    condition: "Used - Like New",
    make: "Mercedes-Benz",
    model: "C-Class",
    genCode: "W205",
    engine: "All",
    year: 2019,
    description: "Staggered set, straight and true. Some minor storage marks.",
    createdAt: "2025-08-18T14:30:00.000Z",
    seller: { name: "WheelMaster", avatar: "/images/seller2.jpg", rating: 4.5 },
  },
  // ... keep the rest of your base items here ...
];

// --- Import the extra seeded items and combine ---
import { moreListings } from "./seedMoreListings";

export const listings: Listing[] = [...baseListings, ...moreListings];
