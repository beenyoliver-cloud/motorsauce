import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log("🚗 Applying garage migration...");
  const sqlPath = join(process.cwd(), "sql", "create_garage_vehicles.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  const { data, error } = await supabase.from("garage_vehicles").select("count").limit(0);
  
  if (error && error.message.includes("does not exist")) {
    console.log("\n📋 Please run this SQL in Supabase SQL Editor:");
    console.log("   https://supabase.com/dashboard/project/ufmkjjmoticwdhxtgyfo/sql/new\n");
    console.log(sql);
    process.exit(0);
  } else if (!error) {
    console.log("✅ Tables already exist!");
  }
}

runMigration().catch(console.error);
