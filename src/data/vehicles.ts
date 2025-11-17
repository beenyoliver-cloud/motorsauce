// src/data/vehicles.ts
// Extended makes & models loaded statically; alternative: fetch('/vehicles.json') if size grows.
export const VEHICLES: Record<string, string[]> = {
  "Aston Martin": ["DB9", "DB11", "DBS", "Vantage", "Vanquish", "Rapide", "DBX"],
  "Audi": ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q5", "Q7", "Q8", "TT", "R8", "RS3", "RS4", "RS5", "RS6", "RS7", "e-tron GT"],
  "BMW": ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "7 Series", "8 Series", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "Z4", "M2", "M3", "M4", "M5", "M8", "i4", "iX"],
  "Ferrari": ["488", "F8 Tributo", "SF90", "Roma", "Portofino", "812 Superfast", "296 GTB", "LaFerrari", "F12", "California"],
  "Ford": ["Ka", "Fiesta", "Focus", "Mondeo", "Puma", "Kuga", "Galaxy", "S-MAX", "Ranger", "Transit", "Mustang", "GT"],
  "Honda": ["Civic", "Accord", "CR-V", "HR-V", "Jazz", "NSX", "Type R"],
  "Lamborghini": ["Huracán", "Aventador", "Urus", "Gallardo", "Murciélago", "Revuelto"],
  "Lotus": ["Elise", "Exige", "Evora", "Emira"],
  "Maserati": ["Ghibli", "Quattroporte", "Levante", "MC20", "GranTurismo"],
  "McLaren": ["570S", "600LT", "720S", "765LT", "Artura", "GT", "P1"],
  "Mercedes-Benz": ["A-Class", "B-Class", "C-Class", "E-Class", "S-Class", "CLA", "CLS", "GLA", "GLB", "GLC", "GLE", "GLS", "G-Class", "AMG GT", "SL", "SLK", "EQS"],
  "Nissan": ["Micra", "Juke", "Qashqai", "X-Trail", "Leaf", "GT-R", "370Z"],
  "Porsche": ["911", "718 Cayman", "718 Boxster", "Taycan", "Panamera", "Macan", "Cayenne", "Carrera GT"],
  "Toyota": ["Aygo", "Yaris", "Corolla", "Camry", "C-HR", "RAV4", "Highlander", "Land Cruiser", "Prius", "Supra", "GR86"],
  "Volkswagen": ["up!", "Polo", "Golf", "Passat", "Arteon", "T-Roc", "Tiguan", "Touareg", "Touran", "Sharan", "Golf R"],
};

// Optional: year range helper (1990 → current)
export const YEARS: string[] = (() => {
  const arr: string[] = [];
  const end = new Date().getFullYear();
  for (let y = end; y >= 1990; y--) arr.push(String(y));
  return arr;
})();
