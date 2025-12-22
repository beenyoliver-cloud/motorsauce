// Minimal smoke script for the shipped/received flow.
//
// Usage:
// - Ensure env vars NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.
// - Set ORDER_ID and a TEST_JWT for seller/buyer.
// - Then run node scripts/test-order-status-flow.mjs
//
// This script is intentionally simple and does not mutate unless you uncomment calls.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const orderId = process.env.ORDER_ID;
if (!orderId) {
  console.error("Missing ORDER_ID");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: order, error } = await supabase
  .from("orders")
  .select("id, status, shipped_at, delivery_confirmed_at, payout_status")
  .eq("id", orderId)
  .maybeSingle();

if (error) {
  console.error("Failed to load order:", error);
  process.exit(1);
}

console.log("Order:", order);

// NOTE: to actually test the API routes, use fetch with Authorization bearer tokens.
