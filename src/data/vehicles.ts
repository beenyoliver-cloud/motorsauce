// src/data/vehicles.ts
export const VEHICLES: Record<string, string[]> = {
  Audi: ["A1", "A3", "A4", "A6", "Q3", "Q5"],
  BMW: ["1 Series", "3 Series", "5 Series", "X1", "X3"],
  Ford: ["Fiesta", "Focus", "Mondeo", "Kuga"],
  Mercedes: ["A-Class", "C-Class", "E-Class", "GLA"],
  Toyota: ["Yaris", "Corolla", "RAV4"],
  Volkswagen: ["Polo", "Golf", "Passat", "Tiguan"],
};

// Optional: year range helper (1990 → current)
export const YEARS: string[] = (() => {
  const arr: string[] = [];
  const end = new Date().getFullYear();
  for (let y = end; y >= 1990; y--) arr.push(String(y));
  return arr;
})();
