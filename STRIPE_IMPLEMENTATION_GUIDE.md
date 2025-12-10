# 🎯 Stripe Payment Implementation Guide
## Building Safe Marketplace Payments with Buyer Protection

**Date:** December 10, 2025  
**Status:** 🔄 In Progress  
**Goal:** Implement Stripe payments with escrow-style buyer protection

---

## 📋 Table of Contents
1. [Current State](#current-state)
2. [What We're Building](#what-were-building)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Testing](#testing)
5. [Going Live](#going-live)

---

## Current State

### ✅ What You Have
- Basic Stripe Checkout integration
- Basket/cart functionality
- Checkout flow with address collection
- Order creation after payment
- Payment code restored from backup

### ❌ What's Missing
- **No buyer protection period** - Money goes straight to you
- **No escrow/holding funds** - Can't refund if item not received
- **No delivery confirmation** - No way for buyer to confirm receipt
- **No dispute resolution** - Manual process
- **Direct payments only** - Need Stripe Connect for marketplace

---

## What We're Building

### The Safe Marketplace Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. BUYER PURCHASES                                          │
│    → Pays via Stripe Checkout                              │
│    → Funds held in YOUR Stripe account (not seller's)      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SELLER NOTIFIED                                          │
│    → Email: "You have a new order #MS-12345"               │
│    → Action required: Ship item                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. PROTECTION PERIOD (7 days)                               │
│    → Buyer can open dispute if item doesn't arrive         │
│    → Seller can upload tracking proof                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. BUYER CONFIRMS RECEIPT                                   │
│    → Clicks "I received this item" button                  │
│    → OR 7 days pass with no dispute                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. FUNDS RELEASED TO SELLER                                 │
│    → You transfer to seller (later: via Stripe Connect)    │
│    → OR keep as platform fee if direct sale                │
└─────────────────────────────────────────────────────────────┘
```

### Key Features
✅ **Buyer Protection:** 7-day window to report issues  
✅ **Seller Confidence:** Clear timeline, proof of delivery  
✅ **Your Control:** Mediate disputes, ban scammers  
✅ **Revenue:** Take 2-3% platform fee  

---

## Step-by-Step Implementation

### Phase 1: Stripe Account Setup (30 mins)

#### 1.1 Get Stripe API Keys

**Test Mode (for development):**
1. Go to [stripe.com/login](https://stripe.com/login)
2. Click "Developers" → "API keys"
3. Copy these keys:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

**Add to `.env.local`:**
```bash
# Stripe Test Keys
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE

# Your site URL (for redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Add to Vercel Environment Variables:**
1. Go to Vercel → Your Project → Settings → Environment Variables
2. Add both keys for Production, Preview, and Development
3. Redeploy

#### 1.2 Enable Payment Methods
1. Stripe Dashboard → Settings → Payment methods
2. Enable:
   - ✅ Cards (Visa, Mastercard, Amex)
   - ✅ Apple Pay
   - ✅ Google Pay
   - ❌ Bank transfers (later, for high-value items)

---

### Phase 2: Database Schema (1 hour)

#### 2.1 Update Orders Table

Run this SQL in Supabase SQL Editor:

```sql
-- Add buyer protection fields to orders table
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS protection_status TEXT DEFAULT 'protected',
  ADD COLUMN IF NOT EXISTS protection_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS dispute_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
  ADD COLUMN IF NOT EXISTS dispute_resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_resolution TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS refund_amount INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Create protection_status enum type
CREATE TYPE order_protection_status AS ENUM (
  'protected',      -- Within 7-day window
  'delivered',      -- Buyer confirmed delivery
  'disputed',       -- Buyer opened dispute
  'expired',        -- 7 days passed, auto-released
  'refunded'        -- Buyer got refund
);

-- Update column to use enum
ALTER TABLE orders 
  ALTER COLUMN protection_status TYPE order_protection_status 
  USING protection_status::order_protection_status;

-- Set protection expiry for new orders (7 days from creation)
CREATE OR REPLACE FUNCTION set_protection_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.protection_expires_at IS NULL THEN
    NEW.protection_expires_at := NEW.created_at + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_set_protection_expiry
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_protection_expiry();

-- Index for checking expired protections
CREATE INDEX IF NOT EXISTS idx_orders_protection_expiry 
  ON orders(protection_expires_at) 
  WHERE protection_status = 'protected';

-- Index for stripe lookups
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent 
  ON orders(stripe_payment_intent_id);
```

#### 2.2 Create Disputes Table

```sql
-- Table for tracking disputes
CREATE TABLE IF NOT EXISTS order_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[], -- Array of image URLs
  status TEXT DEFAULT 'open', -- open, investigating, resolved_refund, resolved_release
  admin_notes TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for disputes
ALTER TABLE order_disputes ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own disputes
CREATE POLICY "Buyers can view own disputes"
  ON order_disputes FOR SELECT
  USING (opened_by = auth.uid());

-- Buyers can create disputes on their orders
CREATE POLICY "Buyers can create disputes"
  ON order_disputes FOR INSERT
  WITH CHECK (
    opened_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders 
      WHERE id = order_id 
      AND buyer_id = auth.uid()
    )
  );

-- Admins can see all disputes
CREATE POLICY "Admins can see all disputes"
  ON order_disputes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );

-- Index for admin dashboard
CREATE INDEX idx_disputes_status ON order_disputes(status, created_at DESC);
```

---

### Phase 3: Backend API Updates (2-3 hours)

#### 3.1 Update Checkout Session API

File: `src/app/api/checkout/session/route.ts`

**Current issue:** Uses `mode: "payment"` which charges immediately.  
**Solution:** We'll keep this for now, but store payment intent ID for potential refunds.

Add after session creation:

```typescript
// After: const session = await stripe.checkout.sessions.create({...})

// Store payment intent for refunds
const paymentIntentId = session.payment_intent as string;

return NextResponse.json({ 
  url: session.url,
  sessionId: session.id,
  paymentIntentId // Send to frontend
});
```

#### 3.2 Create Delivery Confirmation API

Create: `src/app/api/orders/[id]/confirm-delivery/route.ts`

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is the buyer
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("buyer_id, protection_status, seller_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: "Not your order" }, { status: 403 });
    }

    if (order.protection_status !== "protected") {
      return NextResponse.json(
        { error: "Order protection has already ended" },
        { status: 400 }
      );
    }

    // Update order status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        protection_status: "delivered",
        delivery_confirmed_at: new Date().toISOString(),
        delivery_confirmed_by: user.id,
      })
      .eq("id", orderId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to confirm delivery" },
        { status: 500 }
      );
    }

    // TODO: Send notification to seller
    // TODO: Release funds (when we implement Stripe Connect)

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Confirm delivery error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

#### 3.3 Create Dispute Opening API

Create: `src/app/api/orders/[id]/dispute/route.ts`

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const user = await getCurrentUser();
    const body = await req.json();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reason, description, evidence_urls } = body;

    // Verify user is the buyer
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("buyer_id, protection_status, protection_expires_at")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: "Not your order" }, { status: 403 });
    }

    if (order.protection_status !== "protected") {
      return NextResponse.json(
        { error: "Protection period has ended" },
        { status: 400 }
      );
    }

    // Check if within protection window
    if (new Date(order.protection_expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Protection period has expired" },
        { status: 400 }
      );
    }

    // Create dispute
    const { data: dispute, error: disputeError } = await supabase
      .from("order_disputes")
      .insert({
        order_id: orderId,
        opened_by: user.id,
        reason,
        description,
        evidence_urls,
        status: "open",
      })
      .select()
      .single();

    if (disputeError) {
      return NextResponse.json(
        { error: "Failed to create dispute" },
        { status: 500 }
      );
    }

    // Update order status
    await supabase
      .from("orders")
      .update({
        protection_status: "disputed",
        dispute_opened_at: new Date().toISOString(),
        dispute_reason: reason,
      })
      .eq("id", orderId);

    // TODO: Send notification to seller and admins

    return NextResponse.json({ success: true, dispute });
  } catch (error) {
    console.error("Dispute creation error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

---

### Phase 4: Frontend Components (2-3 hours)

#### 4.1 Order Detail Page with Protection Status

Create: `src/app/orders/[id]/page.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { formatGBP } from "@/lib/currency";
import { Package, AlertCircle, CheckCircle, Clock } from "lucide-react";

type Order = {
  id: string;
  created_at: string;
  status: string;
  total: number;
  protection_status: string;
  protection_expires_at: string;
  delivery_confirmed_at: string | null;
  tracking_number: string | null;
  dispute_opened_at: string | null;
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadOrder();
  }, []);

  async function loadOrder() {
    const { id } = await params;
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .eq("buyer_id", user.id)
        .single();

      if (error || !data) {
        console.error("Order not found:", error);
        return;
      }

      setOrder(data as Order);
    } catch (error) {
      console.error("Failed to load order:", error);
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelivery() {
    if (!order) return;
    setConfirming(true);

    try {
      const res = await fetch(`/api/orders/${order.id}/confirm-delivery`, {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to confirm delivery");
        return;
      }

      alert("✅ Delivery confirmed! Seller will be notified.");
      loadOrder(); // Reload to see updated status
    } catch (error) {
      console.error("Failed to confirm delivery:", error);
      alert("Failed to confirm delivery");
    } finally {
      setConfirming(false);
    }
  }

  function openDispute() {
    if (!order) return;
    router.push(`/orders/${order.id}/dispute`);
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="text-gray-600">Loading order...</div>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="text-gray-900">Order not found</div>
      </section>
    );
  }

  const daysRemaining = order.protection_expires_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(order.protection_expires_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Order #{order.id.slice(0, 8)}
      </h1>

      {/* Protection Status Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Buyer Protection
        </h2>

        {order.protection_status === "protected" && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-blue-900">
                Protected Purchase
              </div>
              <div className="text-sm text-blue-700 mt-1">
                You have {daysRemaining} days remaining to confirm delivery or
                open a dispute.
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={confirmDelivery}
                  disabled={confirming}
                  className="px-4 py-2 rounded-md bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {confirming ? "Confirming..." : "✓ I received this item"}
                </button>
                <button
                  onClick={openDispute}
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                >
                  Report a problem
                </button>
              </div>
            </div>
          </div>
        )}

        {order.protection_status === "delivered" && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <div className="font-medium text-green-900">
                Delivery Confirmed
              </div>
              <div className="text-sm text-green-700 mt-1">
                You confirmed receipt on{" "}
                {new Date(order.delivery_confirmed_at!).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}

        {order.protection_status === "disputed" && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <div className="font-medium text-yellow-900">Dispute Open</div>
              <div className="text-sm text-yellow-700 mt-1">
                Our team is reviewing your dispute. We'll contact you within 24
                hours.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Order Details
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Order Date:</span>
            <span className="text-gray-900">
              {new Date(order.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Paid:</span>
            <span className="text-gray-900 font-bold">
              {formatGBP(order.total)}
            </span>
          </div>
          {order.tracking_number && (
            <div className="flex justify-between">
              <span className="text-gray-600">Tracking:</span>
              <span className="text-gray-900 font-mono">
                {order.tracking_number}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
```

---

### Phase 5: Cron Job for Auto-Expiry (1 hour)

Create: `src/app/api/cron/expire-protection/route.ts`

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// This will be called by Vercel Cron or external cron job
export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find all orders where protection has expired
    const { data: expiredOrders, error } = await supabase
      .from("orders")
      .select("id, buyer_id, seller_id, total")
      .eq("protection_status", "protected")
      .lt("protection_expires_at", new Date().toISOString());

    if (error) {
      console.error("Error fetching expired orders:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      return NextResponse.json({ message: "No expired orders", count: 0 });
    }

    // Update all expired orders
    const orderIds = expiredOrders.map((o) => o.id);
    const { error: updateError } = await supabase
      .from("orders")
      .update({ protection_status: "expired" })
      .in("id", orderIds);

    if (updateError) {
      console.error("Error updating orders:", updateError);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    console.log(`✅ Expired ${expiredOrders.length} order protections`);

    // TODO: Send notifications to sellers that funds are released
    // TODO: Transfer funds via Stripe Connect

    return NextResponse.json({
      message: "Protection periods expired",
      count: expiredOrders.length,
      orderIds,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

**Setup Vercel Cron:**

Create: `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/expire-protection",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

This runs every 6 hours. Add to `.env`:
```
CRON_SECRET=your-random-secret-here-generate-with-openssl
```

---

## Testing Checklist

### Test Mode (with Stripe test keys)

1. **✅ Purchase Flow**
   - [ ] Add item to basket
   - [ ] Go to checkout
   - [ ] Use test card: `4242 4242 4242 4242`
   - [ ] Complete purchase
   - [ ] Order created with `protection_status = 'protected'`

2. **✅ Delivery Confirmation**
   - [ ] Go to order detail page
   - [ ] See "X days remaining" protection notice
   - [ ] Click "I received this item"
   - [ ] Status changes to `delivered`

3. **✅ Dispute Flow**
   - [ ] Make another purchase
   - [ ] Click "Report a problem"
   - [ ] Fill dispute form
   - [ ] Status changes to `disputed`

4. **✅ Auto-Expiry**
   - [ ] Manually call cron endpoint:
     ```bash
     curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
       https://your-site.vercel.app/api/cron/expire-protection
     ```
   - [ ] Check old orders auto-expire

---

## Going Live

### Step 1: Switch to Live Stripe Keys

1. Complete Stripe account activation
2. Add business details
3. Enable live mode
4. Update environment variables with `sk_live_...` keys

### Step 2: Update Terms of Service

Add sections:
- Buyer protection policy (7 days)
- Dispute resolution process
- Refund policy
- Platform fees (2-3%)

### Step 3: Add Platform Fee

Update your checkout to include platform fee:

```typescript
// In checkout/session/route.ts
const platformFee = Math.round(totalAmount * 0.025); // 2.5% fee
line_items.push({
  quantity: 1,
  price_data: {
    currency: "gbp",
    unit_amount: platformFee,
    product_data: { name: "Platform service fee" },
  },
});
```

---

## Next Steps (After Basic Implementation)

### Phase 6: Stripe Connect (For Direct Seller Payouts)
- Onboard sellers to Stripe
- Transfer funds directly to seller accounts
- Handle splits (seller gets 97.5%, you keep 2.5%)

### Phase 7: Advanced Features
- Partial refunds
- Tracking integration (Royal Mail, DPD)
- Automatic dispute resolution
- Insurance for high-value items
- Seller verification badges

---

## Support & Resources

**Stripe Documentation:**
- [Checkout Session](https://stripe.com/docs/api/checkout/sessions)
- [Payment Intents](https://stripe.com/docs/payments/payment-intents)
- [Refunds](https://stripe.com/docs/refunds)
- [Connect (Marketplace)](https://stripe.com/docs/connect)

**Testing:**
- [Test Card Numbers](https://stripe.com/docs/testing)
- [Webhook Testing](https://stripe.com/docs/webhooks/test)

---

## Questions?

As you implement each phase, we can:
1. Debug issues together
2. Optimize the flow
3. Add requested features
4. Prepare for live launch

Let's start with **Phase 1** - getting your Stripe keys set up. Do you already have a Stripe account?
