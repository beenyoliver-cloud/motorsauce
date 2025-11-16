# Basket & Messaging System Fixes

## Issues Fixed

### 1. Basket System ✅
**Problem:** The "Buy now" button bypassed the basket entirely, going directly to checkout with a `?listing={id}` parameter. This meant the basket system was never used.

**Solution:**
- Changed "Buy now" button to go through `/basket/add?listing={id}&redirect=checkout`
- Updated `/basket/add` page to handle the `redirect` parameter
- If `redirect=checkout`, it adds the item to the basket and then redirects to `/checkout`
- If no redirect parameter, it adds to basket and shows the basket page (for "Add to basket" button)
- Now both buttons properly use the cart system stored in localStorage

**Files Changed:**
- `src/app/listing/[id]/page.tsx` - Updated "Buy now" link
- `src/app/basket/add/page.tsx` - Added redirect logic

### 2. Message Seller Functionality ✅
**Problem:** There were duplicate messaging links causing confusion, and the old localStorage-based chat system was mixed with the new Supabase messaging system.

**Solution:**
- Removed duplicate "Message seller" link from the seller card section
- The `ContactSellerButton` component in the CTAs section already handles messaging properly
- This button uses `createThread()` from `messagesClient.ts` which creates persistent threads in Supabase
- Messaging now consistently uses the Supabase-based system with proper persistence

**Files Changed:**
- `src/app/listing/[id]/page.tsx` - Removed duplicate link from seller card

## How It Works Now

### Basket Flow
```
User clicks "Buy now" 
  → /basket/add?listing={id}&redirect=checkout
  → Adds item to localStorage cart (via addToCartById)
  → Redirects to /checkout
  → User completes checkout with items from cart

OR

User clicks "Add to basket"
  → /basket/add?listing={id}
  → Adds item to localStorage cart
  → Redirects to /basket?added=1
  → User can continue shopping or proceed to checkout
```

### Messaging Flow
```
User clicks "Contact Seller"
  → ContactSellerButton checks authentication
  → Calls createThread(sellerId, listingId) from messagesClient
  → API creates or finds existing thread in Supabase
  → Navigates to /messages/{threadId}
  → User can send messages in persistent thread
```

## Testing Instructions

### Test Basket System
1. Go to any listing page (e.g., `/listing/853bf0f6-d783-4f2f-96b6-8c08bd79be45`)
2. Click "Buy now" - should add to basket and redirect to checkout
3. Go back, click "Add to basket" - should add to basket and show basket page
4. In basket, change quantity using +/- buttons
5. Click "Go to checkout"
6. Fill in delivery details and place order
7. Should see success page with order reference

### Test Messaging System
1. Go to any listing page
2. Click "Contact Seller" button
3. If not logged in, redirected to login
4. If logged in, should create/find thread and navigate to thread page
5. Send a test message
6. Message should persist in Supabase `messages` table
7. Check `/messages` to see thread in inbox

## Stripe Integration (Future)

The checkout system is already wired for Stripe:
- `/api/checkout/session` endpoint exists and creates Stripe checkout sessions
- Currently falls back to local success flow if Stripe key not configured
- To enable: Set `STRIPE_SECRET_KEY` in environment variables
- Webhook handling can be added later for payment confirmation

## Related Files

**Basket System:**
- `src/lib/cartStore.ts` - Cart state management (localStorage)
- `src/app/basket/page.tsx` - Basket view
- `src/app/basket/add/page.tsx` - Add to basket handler
- `src/app/checkout/page.tsx` - Checkout flow
- `src/app/api/checkout/session/route.ts` - Stripe integration

**Messaging System:**
- `src/lib/messagesClient.ts` - Client-side messaging API
- `src/app/api/messages/threads/route.ts` - Threads API
- `src/app/api/messages/[threadId]/route.ts` - Messages API
- `src/app/messages/page.tsx` - Inbox
- `src/app/messages/[id]/page.tsx` - Thread view
- `src/components/ContactSellerButton.tsx` - Contact button component

## Build Status

✅ Build successful (43 routes compiled)
✅ Committed to Git (commit: 7b1fa8b)
✅ Pushed to GitHub
✅ Deployed to Vercel (auto-deploy on push)

---

**Last Updated:** 2025-11-16
**Status:** ✅ Fixed and deployed
