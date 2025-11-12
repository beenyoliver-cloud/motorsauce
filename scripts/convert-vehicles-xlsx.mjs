// Convert an Excel file of vehicles into JSON files the app can consume.
// Usage: node scripts/convert-vehicles-xlsx.mjs input.xlsx
// Reads first sheet with columns (case-insensitive):
//   Make, Model, From, To, ChassisCode, EngineCode, Fuel, DisplacementCC, OemPrefix
// Outputs:
//   - public/vehicles.json (make -> [models]) for UI suggestions
//   - public/vehicles-detailed.json (nested rich structure)

import fs from 'node:fs';
import path from 'node:path';

let xlsx;
try {
  // Lazy import if installed
  xlsx = await import('xlsx');
} catch (e) {
  console.error('\nMissing dependency: xlsx\nInstall it with:\n  npm i -D xlsx\n');
  process.exit(1);
}

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/convert-vehicles-xlsx.mjs <input.xlsx>');
  process.exit(1);
}

const wb = xlsx.readFile(input);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

// Helpers
const norm = (s) => String(s || '').trim();
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** @typedef {{[make:string]: { models: Array<{name:string, production: Array<{from:number,to:number,code?:string}>, engines: Array<{code:string,fuel?:string,displacement_cc?:number}>, oem_part_prefixes?: string[]}> } }} VehicleDataset */

/** @type {VehicleDataset} */
const detailed = {};
/** @type {Record<string, Set<string>>} */
const simple = {};

for (const r of rows) {
  const make = norm(r.Make || r.MAKE || r.make);
  const model = norm(r.Model || r.MODEL || r.model);
  if (!make || !model) continue;

  const from = num(r.From || r.from || r.FROM);
  const to = num(r.To || r.to || r.TO);
  const chassisCode = norm(r.ChassisCode || r.chassis || r.Code || r.code || r.Chassis);
  const engineCode = norm(r.EngineCode || r.engine || r.Engine || r.ENGINE);
  const fuel = norm(r.Fuel || r.fuel || r.FUEL);
  const disp = num(r.DisplacementCC || r.cc || r.Displacement || r.displacement);
  const oemPrefix = norm(r.OemPrefix || r.OEM || r.Prefix || r.oem_prefix);

  if (!detailed[make]) detailed[make] = { models: [] };
  if (!simple[make]) simple[make] = new Set();
  simple[make].add(model);

  // Find or create model entry
  let m = detailed[make].models.find((x) => x.name === model);
  if (!m) {
    m = { name: model, production: [], engines: [] };
    detailed[make].models.push(m);
  }

  // Merge production spans (avoid exact duplicates)
  if (from || to || chassisCode) {
    const span = { from: from ?? 0, to: to ?? (from ?? 0), code: chassisCode || undefined };
    const exists = m.production.some((p) => p.from === span.from && p.to === span.to && p.code === span.code);
    if (!exists) m.production.push(span);
  }

  // Merge engine codes
  if (engineCode) {
    const exists = m.engines.some((e) => e.code === engineCode && e.fuel === (fuel || undefined) && e.displacement_cc === (disp || undefined));
    if (!exists) m.engines.push({ code: engineCode, fuel: fuel || undefined, displacement_cc: disp || undefined });
  }

  // Merge OEM prefixes
  if (oemPrefix) {
    m.oem_part_prefixes = m.oem_part_prefixes || [];
    if (!m.oem_part_prefixes.includes(oemPrefix)) m.oem_part_prefixes.push(oemPrefix);
  }
}

// Sort for stability
for (const make of Object.keys(detailed)) {
  detailed[make].models.sort((a, b) => a.name.localeCompare(b.name));
  for (const mdl of detailed[make].models) {
    mdl.production.sort((a, b) => (a.from - b.from) || (a.to - b.to) || String(a.code || '').localeCompare(String(b.code || '')));
    mdl.engines.sort((a, b) => a.code.localeCompare(b.code));
    if (mdl.oem_part_prefixes) mdl.oem_part_prefixes.sort();
  }
}

const simpleOut = Object.fromEntries(
  Object.entries(simple).map(([make, set]) => [make, Array.from(set).sort()])
);

const outDir = (p) => path.join(process.cwd(), p);
fs.writeFileSync(outDir('public/vehicles.json'), JSON.stringify(simpleOut, null, 2));
fs.writeFileSync(outDir('public/vehicles-detailed.json'), JSON.stringify(detailed, null, 2));

console.log('Wrote:\n - public/vehicles.json\n - public/vehicles-detailed.json');