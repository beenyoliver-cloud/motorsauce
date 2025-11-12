// Simple converter for a CSV list of vehicles to public/vehicles.json (make -> models[])
// Optionally also appends to existing models maintaining sorted uniqueness.
// Usage: node scripts/convert-vehicles-csv.mjs input.csv
// CSV headers (case-insensitive expected): Make, Model
// Extra columns are ignored for the simple output.

import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/convert-vehicles-csv.mjs <input.csv>');
  process.exit(1);
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  if (!lines.length) return [];
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const cols = line.split(',');
    const obj = {};
    header.forEach((h, i) => obj[h] = (cols[i] || '').trim());
    return obj;
  });
}

const raw = fs.readFileSync(input, 'utf8');
const rows = parseCSV(raw);

/** @type {Record<string, Set<string>>} */
const map = {};
for (const r of rows) {
  const make = (r.make || r['make'] || '').trim();
  const model = (r.model || r['model'] || '').trim();
  if (!make || !model) continue;
  if (!map[make]) map[make] = new Set();
  map[make].add(model);
}

// Merge with existing public/vehicles.json if present
const outPath = path.join(process.cwd(), 'public/vehicles.json');
let existing = {};
if (fs.existsSync(outPath)) {
  try { existing = JSON.parse(fs.readFileSync(outPath, 'utf8')); } catch {}
}
for (const make of Object.keys(existing)) {
  if (!map[make]) map[make] = new Set();
  for (const m of existing[make]) map[make].add(m);
}

const final = Object.fromEntries(
  Object.entries(map).map(([make, set]) => [make, Array.from(set).sort()])
);

fs.writeFileSync(outPath, JSON.stringify(final, null, 2));
console.log('Updated public/vehicles.json with', rows.length, 'rows. Makes:', Object.keys(final).length);