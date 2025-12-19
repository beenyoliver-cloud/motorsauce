import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

const MAX_ROWS = 200;
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const REQUIRED_COLUMNS = ["title", "price"];

const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");

type CsvRow = Record<string, string>;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if ((char === "," || char === "\t") && !inQuotes) {
      current.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i++;
      }
      current.push(cell.trim());
      if (current.some((value) => value.length > 0)) {
        rows.push(current);
      }
      current = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  // Push last cell/row
  if (cell.length > 0 || current.length > 0) {
    current.push(cell.trim());
  }
  if (current.length && current.some((value) => value.length > 0)) {
    rows.push(current);
  }

  return rows;
}

const getValue = (row: CsvRow, keys: string[]) => {
  for (const key of keys) {
    if (row[key]) return row[key];
  }
  return "";
};

const toNumber = (value: string) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Please limit uploads to 4MB." },
        { status: 400 }
      );
    }

    const text = await file.text();
    if (!text.trim()) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    const csvRows = parseCsv(text);
    if (csvRows.length < 2) {
      return NextResponse.json(
        { error: "No data rows detected. Include headers and at least one part." },
        { status: 400 }
      );
    }

    const headerRow = csvRows[0].map((col) => normalizeKey(col));
    const missing = REQUIRED_COLUMNS.filter(
      (col) => !headerRow.includes(col)
    );
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing required column(s): ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const rows: CsvRow[] = [];
    for (let i = 1; i < csvRows.length; i++) {
      const raw = csvRows[i];
      if (!raw || raw.every((value) => !value?.trim())) continue;
      const obj: CsvRow = {};
      headerRow.forEach((key, idx) => {
        obj[key] = raw[idx]?.trim() || "";
      });
      rows.push(obj);
    }

    if (!rows.length) {
      return NextResponse.json(
        { error: "No valid rows detected. Please check your file." },
        { status: 400 }
      );
    }

    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Too many rows. Please upload ${MAX_ROWS} items or fewer per file.` },
        { status: 400 }
      );
    }

    const successes: { id: string; title: string }[] = [];
    const failures: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNumber = i + 2; // account for header row

      const title = row["title"];
      const priceRaw = row["price"];
      if (!title || !priceRaw) {
        failures.push({
          row: lineNumber,
          message: "Missing title or price.",
        });
        continue;
      }

      const price = Number(priceRaw);
      if (!Number.isFinite(price) || price <= 0) {
        failures.push({
          row: lineNumber,
          message: `Invalid price "${priceRaw}".`,
        });
        continue;
      }

      const category = getValue(row, ["category", "main_category"]) || "Aftermarket";
      const condition =
        getValue(row, ["condition", "state"]) || "Used - Good";
      const description = getValue(row, ["description", "details"]) || null;
      const make = row["make"] || null;
      const model = row["model"] || null;
      const yearFrom =
        toNumber(getValue(row, ["year_from", "yearfrom", "from_year"])) ??
        toNumber(row["year"]) ??
        null;
      const yearTo =
        toNumber(getValue(row, ["year_to", "yearto", "to_year"])) ??
        toNumber(row["year"]) ??
        null;
      const oem = row["oem"] || row["sku"] || null;
      const quantity = toNumber(row["quantity"] || row["qty"]) ?? 1;
      const imageField =
        getValue(row, ["image_urls", "images", "image_url"]) || "";
      const images = imageField
        ? imageField
            .split(/[,;|\n]/)
            .map((url) => url.trim())
            .filter(Boolean)
        : [];

      const listingPayload: Record<string, unknown> = {
        seller_id: user.id,
        title,
        description,
        price,
        price_cents: Math.round(price * 100),
        condition,
        category,
        make,
        model,
        year_from: yearFrom,
        year_to: yearTo,
        oem,
        quantity,
        images,
        status: "draft",
      };

      const { data, error } = await supabase
        .from("listings")
        .insert(listingPayload)
        .select("id, title")
        .single();

      if (error || !data) {
        failures.push({
          row: lineNumber,
          message: error?.message || "Failed to save row.",
        });
        continue;
      }

      successes.push({ id: data.id, title: data.title });
    }

    return NextResponse.json({
      inserted: successes.length,
      failed: failures.length,
      items: successes,
      errors: failures,
    });
  } catch (error) {
    console.error("[bulk-upload] unexpected error", error);
    return NextResponse.json(
      { error: "Something went wrong while processing the file." },
      { status: 500 }
    );
  }
}
