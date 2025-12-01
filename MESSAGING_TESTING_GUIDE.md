# Messaging System Testing Guide

## 🧪 How to Test the Fixes

### Prerequisites
- Two user accounts (or use one browser + one incognito window)
- At least one listing to reference in conversation

---

## Test 1: Message Sending Without Refresh Interference

### Steps:
1. **Log in as User A**
2. Navigate to a listing owned by User B
3. Click "Message Seller"
4. **Type a message** (e.g., "Is this still available?")
5. **Wait 6+ seconds** (let polling fire at least once while typing)
6. Click **"Send"**

### Expected Result:
- ✅ Message appears **immediately** below (no delay)
- ✅ Input field clears
- ✅ No "disappearing message" glitch
- ✅ Message stays visible after next poll
- ✅ "Sending..." button shows while processing

### What Was Broken Before:
- ❌ Message would disappear after sending
- ❌ Polling would overwrite the optimistic UI update
- ❌ Draft field would reset mid-typing

---

## Test 2: Mark as Unread (eBay-Style)

### Steps:
1. **Log in as User A**
2. Navigate to `/messages`
3. Open any thread (e.g., conversation with User B)
4. Click **"Unread"** button in top-right corner
5. Observe redirect to `/messages`

### Expected Result:
- ✅ Thread shows as **unread** in list (bold text, badge)
- ✅ Thread NOT deleted (still visible)
- ✅ Can re-open thread and mark as read again

### Database Check:
```sql
-- Before clicking "Unread"
SELECT * FROM thread_read_status WHERE thread_id = 'your-thread-id' AND user_id = 'user-a-id';
-- Result: 1 row with last_read_at timestamp

-- After clicking "Unread"
SELECT * FROM thread_read_status WHERE thread_id = 'your-thread-id' AND user_id = 'user-a-id';
-- Result: 0 rows (deleted)
```

---

## Test 3: Rapid Message Sending

### Steps:
1. **Log in as User A**
2. Open a thread
3. Quickly type and send 3 messages in a row:
   - "Message 1" → Send
   - "Message 2" → Send
   - "Message 3" → Send
4. Wait 5 seconds for polling

### Expected Result:
- ✅ All 3 messages appear in order
- ✅ No duplicates
- ✅ No messages missing
- ✅ Polling doesn't cause re-ordering

---

## Test 4: Polling Doesn't Interrupt Typing

### Steps:
1. **Log in as User A**
2. Open a thread
3. Start typing a **long message** (but don't send yet)
4. **Wait 6+ seconds** (let polling fire while typing)
5. Continue typing
6. Click **"Send"**

### Expected Result:
- ✅ Draft NOT cleared during polling
- ✅ Cursor position NOT reset
- ✅ Typing NOT interrupted
- ✅ Message sends successfully

---

## Test 5: Error Handling

### Steps:
1. **Log in as User A**
2. Open a thread
3. **Disconnect internet** (turn off WiFi)
4. Type a message: "Test offline send"
5. Click **"Send"**

### Expected Result:
- ✅ Error message appears: "Failed to send message"
- ✅ Draft **NOT cleared** (message still in input field)
- ✅ Can edit and retry after reconnecting

---

## Test 6: Cross-User Read Status

### Steps:
1. **Log in as User A** (Browser 1)
2. Open thread with User B
3. Click **"Unread"**
4. **Log in as User B** (Browser 2 / Incognito)
5. Navigate to `/messages`
6. Check if thread with User A shows as unread

### Expected Result:
- ✅ User A sees thread as **unread** (their own action)
- ✅ User B sees thread as **read** (unaffected by User A's action)
- ✅ Read status is **per-user**, not global

---

## Test 7: Delete Thread

### Steps:
1. **Log in as User A**
2. Open a thread
3. Click **"Delete"** button
4. Observe redirect to `/messages`

### Expected Result:
- ✅ Thread **no longer visible** for User A
- ✅ Thread **still visible** for User B (soft delete)
- ✅ Database: `thread_deletions` table has entry for User A

### Database Check:
```sql
SELECT * FROM thread_deletions WHERE thread_id = 'your-thread-id' AND user_id = 'user-a-id';
-- Result: 1 row (User A deleted it)

SELECT * FROM thread_deletions WHERE thread_id = 'your-thread-id' AND user_id = 'user-b-id';
-- Result: 0 rows (User B can still see it)
```

---

## Test 8: New Conversation Start

### Steps:
1. **Log in as User A**
2. Navigate to a listing by User B
3. Click **"Message Seller"**
4. Observe if `/messages/new?peerId=user-b-id` loads
5. Send first message: "Hello!"

### Expected Result:
- ✅ Thread created automatically
- ✅ User redirected to `/messages/{threadId}`
- ✅ Message appears in conversation
- ✅ User B sees new thread in their `/messages`

---

## Test 9: Offer Integration (If Implemented)

### Steps:
1. **Log in as User A**
2. Open thread with User B about a listing
3. Send an offer: "I'll offer £500"
4. Check if offer message appears differently

### Expected Result:
- ✅ Offer shown in yellow box (not regular message bubble)
- ✅ Offer details: amount, currency, status
- ✅ Both users see offer message

---

## Test 10: Mobile Responsive

### Steps:
1. **Log in on mobile device** (or use Chrome DevTools mobile view)
2. Navigate to `/messages`
3. Open a thread
4. Send a message
5. Click "Unread" button

### Expected Result:
- ✅ Messages properly sized (max 90vw width)
- ✅ Buttons responsive (text hidden on small screens)
- ✅ Composer not covered by mobile tab bar
- ✅ Auto-scroll to bottom works

---

## 🐛 Common Issues & Troubleshooting

### Issue: "Message not appearing after send"
**Check**:
1. Network tab: Is `/api/messages/{threadId}` POST returning 200?
2. Console: Any errors from `sendMessage()`?
3. Database: Is message inserted in `messages` table?

**Fix**:
- Check Supabase RLS policies on `messages` table
- Verify bearer token in Authorization header
- Check `from_user_id` matches current user

---

### Issue: "Polling causing lag"
**Check**:
1. Is `isSendingRef.current` properly set?
2. Are there 100+ messages in thread?

**Fix**:
- Increase polling interval from 5s to 10s (in `setInterval`)
- Add pagination for large threads

---

### Issue: "Mark as Unread not working"
**Check**:
1. Network tab: Is `/api/messages/read` DELETE returning 200?
2. Database: Is `thread_read_status` row deleted?

**Fix**:
- Check RLS policies on `thread_read_status` table
- Verify `threadId` is correct UUID format

---

## 📊 Performance Benchmarks

### Expected Metrics:
- **Message Send Time**: < 500ms
- **Polling Interval**: 5 seconds
- **Polling Blocked During Send**: 1 second
- **Initial Load Time**: < 1 second (empty thread)
- **Thread List Load**: < 2 seconds (50 threads)

### Monitor:
```javascript
// In browser console
performance.mark('send-start');
// ... user clicks send ...
performance.mark('send-end');
performance.measure('send-duration', 'send-start', 'send-end');
console.log(performance.getEntriesByName('send-duration'));
```

---

## ✅ Success Criteria

All tests should pass with:
- ✅ **No TypeScript errors**
- ✅ **No console errors** (except expected network failures in Test 5)
- ✅ **No layout shifts** or UI glitches
- ✅ **Responsive on mobile** (320px - 1920px width)
- ✅ **Cross-browser compatible** (Chrome, Firefox, Safari, Edge)

---

## 🚀 Ready for Production

Once all tests pass, the messaging system is **production-ready** and matches **eBay messaging UX**.

**Next deployment**: Merge to `main` branch and deploy to production.
