// Quick diagnostics to check Supabase status
// Add this to test your setup:

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function diagnoseSupabase() {
  console.log("=== Supabase Diagnostics ===");
  console.log("URL:", url ? "✓ Set" : "✗ Not set");
  console.log("Key:", anon ? "✓ Set" : "✗ Not set");

  try {
    const supabase = createClient(url, anon);
    
    // Test 1: Can we connect?
    console.log("\n1. Testing connection...");
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.log("Auth error:", authError.message);
    } else {
      console.log("✓ Connected (no active session - normal)");
    }

    // Test 2: Can we query the offers table?
    console.log("\n2. Testing offers table...");
    const { data, error: queryError, status } = await supabase
      .from("offers")
      .select("id")
      .limit(1);
    
    if (queryError) {
      console.log("✗ Error:", queryError.message);
      console.log("  Code:", queryError.code);
      if (queryError.code === "PGRST116") {
        console.log("  → Table doesn't exist yet");
      }
    } else {
      console.log("✓ Table exists, query successful");
    }

    // Test 3: Check RPC functions
    console.log("\n3. Testing RPC functions...");
    const { error: rpcError } = await supabase.rpc("create_offer_standalone", {
      p_listing_id: "00000000-0000-0000-0000-000000000000",
      p_seller_id: "00000000-0000-0000-0000-000000000000",
      p_listing_title: "test",
      p_listing_price: 100,
      p_offered_amount: 90,
    });

    if (rpcError) {
      console.log("✗ Error:", rpcError.message);
    } else {
      console.log("✓ RPC function exists");
    }

  } catch (error) {
    console.error("Fatal error:", error);
  }
}

// Run diagnostics
diagnoseSupabase();
