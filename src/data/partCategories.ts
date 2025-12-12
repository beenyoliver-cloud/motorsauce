// Comprehensive car parts category system with subcategories

export type MainCategory = 
  | "Engine & Performance"
  | "Brakes & Suspension"
  | "Transmission & Drivetrain"
  | "Exhaust & Intake"
  | "Cooling & Heating"
  | "Electrical & Lighting"
  | "Body & Exterior"
  | "Interior & Trim"
  | "Wheels & Tyres"
  | "Fuel System"
  | "Steering & Control"
  | "Tools & Equipment"
  | "Service Parts"
  | "Other";

export type PartCategory = {
  main: MainCategory;
  subcategory: string;
  searchTerms?: string[]; // Alternative names for fuzzy search
};

export const PART_CATEGORIES: Record<string, { main: MainCategory; subcategories: string[]; searchTerms?: string[] }> = {
  "Engine & Performance": {
    main: "Engine & Performance",
    subcategories: [
      "Engine Block & Parts",
      "Cylinder Head & Valves",
      "Pistons & Rings",
      "Crankshaft & Camshaft",
      "Timing Belt & Chain",
      "Engine Mounts",
      "Gaskets & Seals",
      "Oil Pump & Pan",
      "Turbocharger & Supercharger",
      "Intercooler",
      "Performance Chips & ECU",
      "Spark Plugs & Ignition",
      "Distributor & Coil Packs",
    ],
    searchTerms: ["motor", "powerplant", "turbo", "supercharger", "ecu", "remap"],
  },
  
  "Brakes & Suspension": {
    main: "Brakes & Suspension",
    subcategories: [
      "Brake Pads",
      "Brake Discs/Rotors",
      "Brake Calipers",
      "Brake Lines & Hoses",
      "Master Cylinder",
      "ABS Components",
      "Handbrake Parts",
      "Coilovers",
      "Springs & Shocks",
      "Struts & Dampers",
      "Control Arms",
      "Ball Joints",
      "Anti-Roll Bars",
      "Bushings & Mounts",
    ],
    searchTerms: ["coilover", "damper", "shock absorber", "suspension arms", "arb"],
  },
  
  "Transmission & Drivetrain": {
    main: "Transmission & Drivetrain",
    subcategories: [
      "Gearbox/Transmission",
      "Clutch Kit",
      "Flywheel",
      "Clutch Master & Slave",
      "Differential",
      "Driveshaft",
      "CV Joints & Boots",
      "Transfer Case",
      "Prop Shaft",
      "Gear Linkage",
      "Gear Knob & Gaiter",
    ],
    searchTerms: ["gearbox", "manual transmission", "automatic transmission", "diff", "propshaft"],
  },
  
  "Exhaust & Intake": {
    main: "Exhaust & Intake",
    subcategories: [
      "Exhaust Manifold",
      "Downpipe",
      "Cat/Catalytic Converter",
      "Mid Section/Centre Pipe",
      "Backbox/Rear Section",
      "Full Exhaust System",
      "Exhaust Tips",
      "Air Filter",
      "Air Intake Kit",
      "Induction Kit",
      "Mass Air Flow (MAF)",
      "Throttle Body",
    ],
    searchTerms: ["cat back", "decat", "sports cat", "cold air intake", "panel filter"],
  },
  
  "Cooling & Heating": {
    main: "Cooling & Heating",
    subcategories: [
      "Radiator",
      "Cooling Fan",
      "Water Pump",
      "Thermostat",
      "Coolant Hoses",
      "Expansion Tank",
      "Heater Core",
      "Climate Control Unit",
      "AC Compressor",
      "AC Condenser",
      "Oil Cooler",
    ],
    searchTerms: ["rad", "cooling system", "aircon", "air conditioning", "hvac"],
  },
  
  "Electrical & Lighting": {
    main: "Electrical & Lighting",
    subcategories: [
      "Headlights",
      "Tail Lights",
      "Fog Lights",
      "Indicator Lights",
      "Interior Lights",
      "LED Bulbs",
      "HID/Xenon Kits",
      "Battery",
      "Alternator",
      "Starter Motor",
      "Wiring Harness",
      "Fuse Box",
      "Sensors (Various)",
      "Window Motors",
      "Central Locking",
    ],
    searchTerms: ["headlamps", "xenon", "angel eyes", "alternater", "starter", "lambda sensor", "o2 sensor"],
  },
  
  "Body & Exterior": {
    main: "Body & Exterior",
    subcategories: [
      "Bonnet",
      "Wings/Fenders",
      "Doors",
      "Boot/Tailgate",
      "Bumpers",
      "Grilles",
      "Mirrors",
      "Spoilers",
      "Body Kit",
      "Splitters & Diffusers",
      "Skirts (Side/Rear)",
      "Windscreen/Glass",
      "Wipers & Arms",
      "Door Handles",
      "Badges & Emblems",
    ],
    searchTerms: ["hood", "fender", "trunk", "spoiler", "bodykit", "aero"],
  },
  
  "Interior & Trim": {
    main: "Interior & Trim",
    subcategories: [
      "Seats",
      "Steering Wheel",
      "Dashboard",
      "Door Cards/Panels",
      "Centre Console",
      "Gear Knob",
      "Gear Gaiter",
      "Pedals",
      "Floor Mats",
      "Carpet Set",
      "Headliner",
      "Sun Visors",
      "Interior Trim Pieces",
      "Armrest",
      "Cubby Box",
    ],
    searchTerms: ["bucket seat", "racing seat", "dash", "doorcards", "shift knob"],
  },
  
  "Wheels & Tyres": {
    main: "Wheels & Tyres",
    subcategories: [
      "Alloy Wheels",
      "Steel Wheels",
      "Wheel Spacers",
      "Hub Centric Rings",
      "Locking Wheel Nuts",
      "Tyres/Tires",
      "TPMS Sensors",
      "Wheel Bearings",
      "Hub Caps",
    ],
    searchTerms: ["rims", "alloys", "tires", "rubber", "wheel nuts", "spacers"],
  },
  
  "Fuel System": {
    main: "Fuel System",
    subcategories: [
      "Fuel Pump",
      "Fuel Injectors",
      "Fuel Rail",
      "Fuel Filter",
      "Fuel Lines",
      "Fuel Tank",
      "Fuel Cap",
      "Fuel Pressure Regulator",
    ],
    searchTerms: ["injector", "fpr", "fuel rail"],
  },
  
  "Steering & Control": {
    main: "Steering & Control",
    subcategories: [
      "Steering Rack",
      "Power Steering Pump",
      "Steering Column",
      "Steering Wheel",
      "Track Rod Ends",
      "Tie Rods",
      "Steering Arms",
      "Quick Release Hub",
    ],
    searchTerms: ["pas pump", "power steering", "steering wheel boss"],
  },
  
  "Service Parts": {
    main: "Service Parts",
    subcategories: [
      "Engine Oil",
      "Oil Filters",
      "Air Filters",
      "Fuel Filters",
      "Cabin Filters",
      "Spark Plugs",
      "Brake Fluid",
      "Coolant",
      "Transmission Fluid",
      "Service Kits",
    ],
    searchTerms: ["maintenance", "consumables", "fluids", "filters"],
  },
  
  "Tools & Equipment": {
    main: "Tools & Equipment",
    subcategories: [
      "Diagnostic Tools",
      "OBD2 Scanner",
      "Socket Sets",
      "Torque Wrench",
      "Jack & Stands",
      "Ramps",
      "Spring Compressor",
      "Timing Tools",
      "Speciality Tools",
      "Workshop Equipment",
    ],
    searchTerms: ["obd reader", "code reader", "scan tool", "diagnostics"],
  },
  
  "Other": {
    main: "Other",
    subcategories: [
      "Unclassified",
    ],
    searchTerms: [],
  },
};

// Flatten for easy dropdown usage
export const getAllSubcategories = (): string[] => {
  const allSubs: string[] = [];
  Object.values(PART_CATEGORIES).forEach(cat => {
    allSubs.push(...cat.subcategories);
  });
  return allSubs.sort();
};

export const getMainCategories = (): MainCategory[] => {
  return Object.keys(PART_CATEGORIES) as MainCategory[];
};

export const getSubcategoriesForMain = (main: MainCategory): string[] => {
  return PART_CATEGORIES[main]?.subcategories || [];
};

// Fuzzy search helper - checks if search term matches category or subcategory (with typo tolerance)
export const findMatchingCategories = (searchTerm: string): { main: MainCategory; subcategory: string }[] => {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return [];
  
  const matches: { main: MainCategory; subcategory: string }[] = [];
  
  Object.entries(PART_CATEGORIES).forEach(([mainCat, data]) => {
    // Check main category
    if (mainCat.toLowerCase().includes(term)) {
      data.subcategories.forEach(sub => {
        matches.push({ main: mainCat as MainCategory, subcategory: sub });
      });
      return;
    }
    
    // Check search terms for main category
    if (data.searchTerms?.some(st => st.toLowerCase().includes(term) || term.includes(st.toLowerCase()))) {
      data.subcategories.forEach(sub => {
        matches.push({ main: mainCat as MainCategory, subcategory: sub });
      });
      return;
    }
    
    // Check subcategories
    data.subcategories.forEach(sub => {
      if (sub.toLowerCase().includes(term) || term.includes(sub.toLowerCase())) {
        matches.push({ main: mainCat as MainCategory, subcategory: sub });
      }
    });
  });
  
  return matches;
};
