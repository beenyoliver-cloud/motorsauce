// src/data/catalog.ts

// ---------- Types ----------
export type PartCategory =
  | "Brakes"
  | "Suspension"
  | "Lighting"
  | "Engine"
  | "Intake"
  | "Exhaust"
  | "Cooling"
  | "Drivetrain"
  | "Interior"
  | "Diagnostics"
  | "Wheels";

export type PartType = {
  category: PartCategory;
  name: string;
  oemPrefix?: string;
  priceRange: [number, number];
  image?: string;
};

export type EngineSpec = {
  label: string;
};

export type ModelGen = {
  code: string;
  model: string;
  years: [number, number];
  engines: EngineSpec[];
};

export type Make = {
  make: string;
  gens: ModelGen[];
  oemPrefix?: string;
};

// ---------- Parts taxonomy ----------
export const PARTS: PartType[] = [
  { category: "Brakes",      name: "Front Brake Pads",      oemPrefix: "3411", priceRange: [25, 180], image: "/images/brake-pads.jpg" },
  { category: "Brakes",      name: "Rear Brake Discs",      oemPrefix: "3421", priceRange: [40, 250] },
  { category: "Suspension",  name: "Coilover Kit",          oemPrefix: "3131", priceRange: [220, 1200] },
  { category: "Lighting",    name: "Headlight Assembly",    oemPrefix: "6312", priceRange: [90, 850] },
  { category: "Lighting",    name: "Tail Light",            oemPrefix: "6321", priceRange: [45, 350] },
  { category: "Engine",      name: "Spark Plug Set",        oemPrefix: "1212", priceRange: [12, 80] },
  { category: "Intake",      name: "Air Filter",            oemPrefix: "1371", priceRange: [10, 50],  image: "/images/air-filter.jpg" },
  { category: "Exhaust",     name: "Backbox",               oemPrefix: "1810", priceRange: [80, 420] },
  { category: "Cooling",     name: "Intercooler",           oemPrefix: "1751", priceRange: [120, 600] },
  { category: "Drivetrain",  name: "Clutch Kit",            oemPrefix: "2121", priceRange: [120, 750] },
  { category: "Interior",    name: "Gear Knob",             oemPrefix: "2511", priceRange: [15, 90] },
  { category: "Diagnostics", name: "OBD2 VIN Scanner",                         priceRange: [35, 120], image: "/images/vin-tool.jpg" },
  { category: "Wheels",      name: "Alloy Wheel Set (4)",                      priceRange: [250, 1200], image: "/images/alloy-wheels.jpg" },
];

// ---------- Makes / models / generations (+ engines) ----------
export const MAKES: Make[] = [
  {
    make: "BMW", oemPrefix: "11",
    gens: [
      { code: "E46", model: "3 Series", years: [1998, 2005], engines: [
        { label: "1.8L" }, { label: "2.0L" }, { label: "2.5L" }, { label: "3.0L" }, { label: "3.0L Diesel" }
      ]},
      { code: "E90", model: "3 Series", years: [2005, 2013], engines: [
        { label: "2.0L" }, { label: "2.5L" }, { label: "3.0L" }, { label: "3.0L Diesel" }
      ]},
      { code: "F20", model: "1 Series", years: [2011, 2019], engines: [
        { label: "1.6L" }, { label: "2.0L" }, { label: "2.0L Diesel" }
      ]},
    ],
  },
  {
    make: "Volkswagen", oemPrefix: "1K",
    gens: [
      { code: "Mk5", model: "Golf GTI", years: [2004, 2009], engines: [{ label: "2.0L TFSI" }]},
      { code: "Mk7", model: "Golf GTI", years: [2013, 2020], engines: [{ label: "2.0L TSI" }]},
    ],
  },
  {
    make: "Audi", oemPrefix: "8P",
    gens: [
      { code: "8P", model: "A3", years: [2003, 2013], engines: [
        { label: "1.8L TFSI" }, { label: "2.0L TFSI" }, { label: "2.0L TDI" }
      ]},
      { code: "8V", model: "A3", years: [2012, 2020], engines: [
        { label: "1.4L TFSI" }, { label: "2.0L TFSI" }, { label: "2.0L TDI" }
      ]},
    ],
  },
  {
    make: "Honda", oemPrefix: "17220",
    gens: [
      { code: "FK2", model: "Civic Type R", years: [2015, 2017], engines: [{ label: "2.0L VTEC Turbo" }]},
      { code: "FK8", model: "Civic Type R", years: [2017, 2021], engines: [{ label: "2.0L VTEC Turbo" }]},
    ],
  },
  {
    make: "Ford", oemPrefix: "7M51",
    gens: [
      { code: "Mk2", model: "Focus ST", years: [2005, 2011], engines: [{ label: "2.5L Turbo" }]},
      { code: "Mk3", model: "Focus ST", years: [2012, 2018], engines: [{ label: "2.0L EcoBoost" }]},
    ],
  },
  {
    make: "Mazda", oemPrefix: "N3H1",
    gens: [
      { code: "NB", model: "MX-5", years: [1998, 2005], engines: [{ label: "1.6L" }, { label: "1.8L" }]},
      { code: "ND", model: "MX-5", years: [2015, 2024], engines: [{ label: "1.5L" }, { label: "2.0L" }]},
    ],
  },
  {
    make: "Mercedes-Benz", oemPrefix: "A204",
    gens: [
      { code: "W204", model: "C-Class", years: [2007, 2014], engines: [
        { label: "1.8L" }, { label: "2.0L" }, { label: "3.0L Diesel" }
      ]},
    ],
  },
  {
    make: "Vauxhall", oemPrefix: "13 12",
    gens: [
      { code: "Corsa D", model: "Corsa", years: [2006, 2014], engines: [{ label: "1.2L" }, { label: "1.4L" }, { label: "1.3L CDTi" }]},
      { code: "Astra J", model: "Astra", years: [2009, 2015], engines: [{ label: "1.6L" }, { label: "2.0L CDTi" }]},
    ],
  },
];

// ---------- Helpers ----------
export function randYear([start, end]: [number, number]) {
  return Math.floor(Math.random() * (end - start + 1)) + start;
}
