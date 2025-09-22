// src/data/seedMoreListings.ts
import type { Listing } from "./listings";
import { pick } from "./images";

// Popular platform tuples
const CARS = [
  ["Volkswagen", "Golf", "Mk7", "GTI", 2016],
  ["Volkswagen", "Golf", "Mk7", "2.0 TDI", 2015],
  ["Audi", "A3", "8V", "1.6 TDI", 2015],
  ["Audi", "A4", "B8", "2.0 TFSI", 2014],
  ["BMW", "3 Series", "F30", "320i", 2017],
  ["BMW", "3 Series", "E90", "330i", 2011],
  ["Ford", "Fiesta", "Mk7 ST", "1.6 EcoBoost", 2016],
  ["Ford", "Focus", "Mk3", "1.0 EcoBoost", 2015],
  ["Mercedes-Benz", "C-Class", "W205", "C200", 2019],
  ["Vauxhall", "Astra", "J", "1.4T", 2018],
  ["Vauxhall", "Corsa", "D", "1.2", 2014],
  ["Toyota", "Yaris", "Mk3", "1.33", 2015],
  ["Honda", "Civic", "FK7", "1.5T", 2018],
  ["Nissan", "Qashqai", "J11", "1.5 dCi", 2017],
  ["Peugeot", "208", "GTi", "1.6 THP", 2016],
  ["Renault", "Clio", "IV", "RS 200", 2017],
  ["Škoda", "Octavia", "Mk3", "2.0 TDI", 2016],
  ["SEAT", "Leon", "Mk3", "1.4 TSI", 2016],
  ["Mazda", "3", "BM", "2.0", 2016],
  ["MINI", "Cooper", "R56", "N14", 2010],
] as const;

// Deterministic price pickers
const padPrices = ["£35", "£49", "£69", "£89", "£120"];
const filterPrices = ["£15", "£19", "£24", "£29", "£39"];

// Rotate sellers
const sellers = [
  { name: "AutoJoe", avatar: "/images/seller1.jpg", rating: 4.8 },
  { name: "WheelMaster", avatar: "/images/seller2.jpg", rating: 4.5 },
  { name: "ScanPro", avatar: "/images/seller3.jpg", rating: 4.9 },
  { name: "FilterKing", avatar: "/images/seller4.jpg", rating: 4.6 },
  { name: "TurboTom", avatar: "/images/seller3.jpg", rating: 4.7 },
  { name: "BrakeBuddy", avatar: "/images/seller4.jpg", rating: 4.6 },
];

function dt(offsetDays: number) {
  const base = new Date("2025-08-01T12:00:00Z");
  base.setDate(base.getDate() + offsetDays);
  return base.toISOString();
}

export const moreListings: Listing[] = [];

let idx = 0;
// Pads (OEM)
for (const [make, model, genCode, engine, year] of CARS) {
  const id = `PAD-${String(idx + 101).padStart(4, "0")}`;
  const seller = sellers[idx % sellers.length];
  const image = pick("brake", idx);
  moreListings.push({
    id,
    title: `${make} ${model} ${genCode} Front Brake Pads (OEM)`,
    price: padPrices[idx % padPrices.length],
    image,
    images: [image],
    category: "OEM",
    condition: idx % 3 === 0 ? "New" : idx % 3 === 1 ? "Used - Like New" : "Used - Good",
    make,
    model,
    genCode,
    engine,
    year,
    oem: undefined,
    description: "Quality pads suitable for daily use. Check fitment before purchase.",
    createdAt: dt(40 - idx),
    seller,
  });
  idx++;
}

// Filters (mix OEM/Aftermarket)
for (const [make, model, genCode, engine, year] of CARS) {
  const id = `FILTER-${String(idx + 101).padStart(4, "0")}`;
  const seller = sellers[idx % sellers.length];
  const image = pick("filter", idx);
  moreListings.push({
    id,
    title: `${make} ${model} ${genCode} Air Filter`,
    price: filterPrices[idx % filterPrices.length],
    image,
    images: [image],
    category: idx % 2 === 0 ? "OEM" : "Aftermarket",
    condition: idx % 3 === 0 ? "New" : idx % 3 === 1 ? "Used - Like New" : "Used - Good",
    make,
    model,
    genCode,
    engine,
    year,
    oem: undefined,
    description: "Direct replacement filter. Verify engine code and year before ordering.",
    createdAt: dt(20 - idx),
    seller,
  });
  idx++;
}
