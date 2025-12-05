# Offer Messaging System - Complete Testing Guide

## Overview
This guide walks through all the improvements made to the offer messaging system, including enhanced UI, better data flow, and improved notifications.

## Prerequisites
- Two separate browser windows or profiles (one buyer, one seller)
- Both users logged in to their respective accounts
- At least one active listing available

---

## 1. Test: Make an Offer Flow

### Step 1.1: Buyer Views Listing
1. In **Buyer's browser**, navigate to an active listing
2. Click **"Make an offer"** button
3. Modal should show:
   - ✅ Listing image (larger preview, 16x16 squares)
   - ✅ Listing title
   - ✅ "View listing" link
   - Input field for offer amount
   - Send button

### Step 1.2: Send Offer
1. Enter offer amount (e.g., £75.50)
2. Click "Send Offer"
3. Should redirect to messages thread
4. **In Buyer's thread**, the offer card should display:
   - ✅ Status badge (blue "Pending" with clock icon)
   - ✅ Large listing image (h-24 w-32, with rounded corners)
   - ✅ Header: "Your offer"
   - ✅ Listing title (bold, 2 lines max)
   - ✅ **Prominent price: £75.50 (large, bold text)**
   - ✅ "Sent to seller" with date
   - ✅ "Withdraw Offer" button
   - ✅ Status: "Waiting for response..."

### Step 1.3: Seller Receives Offer
1. In **Seller's browser**, navigate to `/messages`
2. Find conversation with buyer (should be near top, recent)
3. Open conversation
4. **In Seller's thread**, the same offer card should display:
   - ✅ Header: "Offer from [Buyer Name]"
   - ✅ All same details as buyer sees
   - ✅ "Accept" and "Decline" buttons (green and red)
   - ✅ Counter offer input field with "Counter" button
   - ✅ Status: still "Pending"

**Expected Result**: Both users see identical offer card with all listing data present.

---

## 2. Test: Accept Offer & Payment Notification

### Step 2.1: Seller Accepts
1. In **Seller's thread**, click **"Accept"** button
2. Offer status should change to **"✅ Accepted"** (green badge)
3. Seller should see message: "Waiting for response..." disappears, replaced with resolved state

### Step 2.2: Buyer Sees Acceptance
1. In **Buyer's thread**, offer should update to **"✅ Accepted"** (green badge)
2. Buyer should see system message: **"✅ [Seller Name] accepted the offer of £75.50"**
3. Buyer should receive notification (check notifications bell icon in header)

### Step 2.3: Verify Payment Notification
1. **Check notifications**:
   - Should have new notification: "Payment Required"
   - Message: "Your offer of £75.50 was accepted! Please proceed with payment."
   - Link should go to `/checkout?offer={offerId}`
2. Click notification to navigate to checkout (optional for full test)

**Expected Result**: 
- ✅ Offer status updates instantly for both users
- ✅ System message appears with emoji (✅) and clear formatting
- ✅ Buyer receives payment notification
- ✅ UI is clean and professional

---

## 3. Test: Counter Offer Flow

### Step 3.1: Reset (Use Different Listing)
1. Make a new offer on a different listing
2. Seller receives it

### Step 3.2: Seller Counters
1. In **Seller's thread**, enter counter amount in input (e.g., £95.00)
2. Click **"Counter"** button
3. Original offer should show: **"📊 Countered"** (yellow badge)
4. **New offer card appears** below with:
   - ✅ Status: "Pending"
   - ✅ Header: "Your counter offer" (seller's perspective)
   - ✅ Amount: £95.00
   - ✅ "Withdraw" button available

### Step 3.3: Buyer Sees Counter
1. In **Buyer's thread**, original offer shows **"📊 Countered"**
2. System message appears: **"📊 [Seller Name] countered with £95.00"**
3. New offer card appears:
   - ✅ Header: "Offer from [Seller Name]"
   - ✅ Amount: £95.00
   - ✅ Counter input available

### Step 3.4: Buyer Counters Back
1. Enter new amount (e.g., £85.00)
2. Click "Counter"
3. Previous offer changes to **"📊 Countered"**
4. New offer appears with buyer's counter

### Step 3.5: Verify System Messages
At this point, thread should have (from bottom up):
- Latest offer (pending)
- System message: "📊 [Buyer] countered with £85.00"
- Previous offer (countered)
- System message: "📊 [Seller] countered with £95.00"
- Original offer (countered)
- System message: "💬 Conversation started"

**Expected Result**: 
- ✅ Counter flow works smoothly
- ✅ All system messages display with correct icons and formatting
- ✅ Old offers show as "Countered" while new ones are "Pending"

---

## 4. Test: Decline Offer

### Step 4.1: New Offer to Test Decline
1. Make another fresh offer on a different listing
2. Seller receives it

### Step 4.2: Seller Declines
1. In **Seller's thread**, click **"Decline"** button
2. Offer status should change to **"❌ Declined"** (red badge)

### Step 4.3: Buyer Sees Decline
1. In **Buyer's thread**, offer shows **"❌ Declined"**
2. System message appears: **"❌ [Seller Name] declined the offer of £X.XX"**
3. Buyer's "Withdraw" button should disappear

**Expected Result**: 
- ✅ Decline updates instantly
- ✅ System message shows with ❌ emoji
- ✅ Resolved UI is shown (can't take further action)

---

## 5. Test: Withdraw Offer

### Step 5.1: New Offer to Withdraw
1. Make another fresh offer
2. Don't let seller respond yet

### Step 5.2: Buyer Withdraws (Before Seller Responds)
1. In **Buyer's thread**, click **"Withdraw Offer"**
2. Offer status should change to **"🚫 Withdrawn"** (gray badge)
3. System message appears: **"🚫 [Buyer Name] withdrew the offer"**

### Step 5.3: Seller Sees Withdrawal
1. In **Seller's thread** (refresh if needed), offer shows **"🚫 Withdrawn"**
2. Accept/Decline/Counter buttons should be gone

**Expected Result**: 
- ✅ Buyer can withdraw pending offers
- ✅ System message shows with 🚫 emoji
- ✅ Seller sees instantly that offer was withdrawn

---

## 6. Test: Listing Data Persistence

Throughout all tests, verify:

### Step 6.1: Listing Image
- ✅ Image displays correctly in "Make Offer" modal
- ✅ Image displays in all offer cards (buyer & seller view)
- ✅ Image persists through counter offers
- ✅ Image displays even if counter-offered

### Step 6.2: Listing Title
- ✅ Title displays in offer modal
- ✅ Title displays in all offer cards
- ✅ Title remains same even after counters
- ✅ Title doesn't truncate unexpectedly (line-clamp-2)

### Step 6.3: Listing Link
- ✅ Click on offer card image or title
- ✅ Should navigate to `/listing/{listingId}`
- ✅ Should open in same tab

**Expected Result**: 
- ✅ All listing data (image, title, ID) flows correctly through system
- ✅ No data loss on counters or status changes
- ✅ Links work correctly

---

## 7. Test: UI Polish & Responsiveness

### Step 7.1: Desktop View
- ✅ Offer cards have proper spacing and shadows
- ✅ Status badges are colored appropriately
- ✅ Text is readable and not cramped
- ✅ Buttons have hover states
- ✅ Counter input has £ prefix visible

### Step 7.2: Mobile View
1. Resize browser to mobile width (iPhone 375px)
2. Verify:
   - ✅ Offer image size adjusts (h-24 w-32)
   - ✅ Text is readable on small screen
   - ✅ Buttons stack or resize appropriately
   - ✅ Counter input still has £ prefix
   - ✅ No horizontal scroll

### Step 7.3: System Messages
- ✅ Icons display correctly (✅ ❌ 📊 🚫 💬)
- ✅ Messages are centered and readable
- ✅ Color backgrounds match intent (green, red, yellow, etc.)
- ✅ Messages have proper padding and rounded corners

**Expected Result**: 
- ✅ UI is clean and professional on all screen sizes
- ✅ All interactive elements work smoothly
- ✅ No visual glitches or alignment issues

---

## 8. Test: Data Accuracy

### Step 8.1: Price Formatting
- ✅ All prices display as "£X.XX" format
- ✅ No rounding errors
- ✅ Large amounts (£1000+) display correctly

### Step 8.2: User Names
- ✅ System messages show correct seller/buyer names
- ✅ Offer cards show correct peer names
- ✅ Names display in header and metadata

### Step 8.3: Timestamps
- ✅ Messages have timestamps
- ✅ Day separators show correct date
- ✅ Conversation shows in correct order (oldest to newest)

**Expected Result**: 
- ✅ All data is accurate and properly formatted
- ✅ No display errors or missing information

---

## 9. Common Issues & Troubleshooting

| Issue | Solution |
|-------|----------|
| Offer doesn't appear in seller's thread | Refresh page. Check RLS policies allow both users to see messages. |
| Image doesn't show | Verify image URL is valid and accessible. Check CORS settings. |
| System message doesn't appear | Check offers table has correct status. Refresh page. |
| Price shows as "£NaN" | Check amountCents value is numeric in database. |
| Button click doesn't work | Check browser console for errors. Verify auth token is valid. |
| Notification doesn't appear | Check `/api/notifications` is returning 201. Check notifications in bell icon. |

---

## 10. Summary Checklist

- [ ] Offer card displays listing image, title, price clearly
- [ ] Buyer can make, withdraw, and counter offers
- [ ] Seller can accept, decline, and counter offers
- [ ] System messages appear with appropriate icons
- [ ] Offer status updates instantly for both users
- [ ] Payment notification sent when offer accepted
- [ ] Listing data persists through counters
- [ ] UI is responsive on mobile and desktop
- [ ] No console errors during any flow
- [ ] All links work correctly

---

## Testing Complete ✅

If all tests pass, the offer messaging system is working correctly with enhanced UI and proper data flow!

