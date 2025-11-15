# Messaging System Migration Guide

## Overview

The new messaging system replaces the localStorage-based approach with a robust, server-persisted solution using Supabase. This ensures:

- **Persistence**: Messages are stored in the database, not browser storage
- **User Isolation**: User 1 ↔ User 2 messages are separate from User 1 ↔ User 3
- **Soft Deletes**: When User 1 deletes a thread, it only hides for them; User 2 still sees it
- **30-Day Archive**: Threads deleted by both users are archived for 30 days before permanent deletion
- **Proper RLS**: Row-Level Security ensures users only see their own threads and messages

## Step 1: Run SQL Migration

Execute the SQL script to create the new tables and policies:

```bash
# In your Supabase SQL Editor, run:
sql/create_messaging_system.sql
```

This creates:
- `threads` - Conversation threads between two users
- `messages` - Individual messages (text, offers, system)
- `thread_deletions` - Tracks which users have hidden a thread
- `thread_read_status` - Tracks read/unread status per user
- `offers` - Offer details with status tracking

All tables have RLS enabled with proper policies for user isolation.

## Step 2: Update Component Imports

### Messages Inbox (src/app/messages/page.tsx)

Already updated to use `fetchThreads()` from `src/lib/messagesClient.ts`.
- Fetches threads from API instead of localStorage
- Polls for updates every 10 seconds
- Shows loading skeleton during fetch

### Thread View (src/app/messages/[id]/page.tsx)

Update to use the new `ThreadClientNew` component:

```tsx
// Replace the import:
- import ThreadClient from "@/components/ThreadClient";
+ import ThreadClientNew from "@/components/ThreadClientNew";

// Replace the component:
- <ThreadClient threadId={threadId} forceOfferToast={forceOfferToast} />
+ <ThreadClientNew threadId={threadId} />
```

### Make Offer Button (src/app/listing/[id]/page.tsx)

Update to use the new persistent version:

```tsx
// Replace the import:
- import MakeOfferButton from "@/components/MakeOfferButton";
+ import MakeOfferButtonNew from "@/components/MakeOfferButtonNew";

// Ensure sellerId is passed (already done):
<MakeOfferButtonNew
  sellerName={listing.seller?.name || "Seller"}
  sellerId={listing.sellerId}  // Required: seller's UUID
  listingId={listing.id}
  listingTitle={listing.title}
  listingImage={gallery[0] || listing.image}
/>
```

## Step 3: Data Migration (Optional)

If you have existing localStorage data you want to preserve:

1. Users can manually migrate by:
   - Opening old threads in the old system
   - Copying/pasting important messages into new threads

2. Or implement a one-time migration script (not provided) that:
   - Reads from localStorage `threads_v2:u:*` keys
   - Posts messages via API to recreate threads

**Note**: Most localStorage data is client-side only and doesn't need migration. The new system starts fresh with server-persisted data.

## Step 4: Test the Flow

### Test as User 1 (Buyer):
1. Log in as User 1
2. Browse to a listing owned by User 2
3. Click "Make an offer"
4. Enter an amount and submit
5. Verify you're redirected to `/messages/{threadId}`
6. Verify the offer message appears
7. Send a text message
8. Verify it appears in the thread

### Test as User 2 (Seller):
1. Log in as User 2
2. Navigate to `/messages`
3. Verify the thread from User 1 appears with unread badge
4. Open the thread
5. Verify you see the offer and text message from User 1
6. Reply with a text message
7. Use "Accept", "Decline", or "Counter" on the offer (when wired up)

### Test Soft Delete:
1. As User 1, click "Delete" on the thread
2. Verify thread disappears from User 1's inbox
3. As User 2, verify thread still appears in User 2's inbox
4. As User 2, click "Delete"
5. Both users have now deleted; thread is archived (stays in DB for 30 days)

### Test Archive Cleanup:
Run the archive cleanup function manually or via cron:

```sql
SELECT archive_fully_deleted_threads();
```

This returns the count of threads permanently deleted (both users deleted 30+ days ago).

## API Endpoints

### Threads
- `GET /api/messages/threads` - List all threads for authenticated user
- `POST /api/messages/threads` - Create/get thread with peer
  ```json
  {
    "peerId": "uuid-of-peer",
    "listingRef": "optional-listing-id"
  }
  ```

### Messages
- `GET /api/messages/{threadId}` - Fetch messages in thread
- `POST /api/messages/{threadId}` - Send message
  ```json
  {
    "type": "text",
    "text": "Hello!"
  }
  ```
- `DELETE /api/messages/{threadId}` - Soft-delete thread (hide for current user)

### Read Status
- `POST /api/messages/read` - Mark thread as read
  ```json
  {
    "threadId": "t_user1_user2_listingId"
  }
  ```

### Offers
- `GET /api/offers/new?threadId=...` - Get offers for thread
- `POST /api/offers/new` - Create offer
  ```json
  {
    "threadId": "t_...",
    "listingId": "listing-id",
    "listingTitle": "Part title",
    "listingImage": "url",
    "recipientId": "seller-uuid",
    "amountCents": 7500,
    "currency": "GBP"
  }
  ```
- `PATCH /api/offers/new` - Update offer status
  ```json
  {
    "offerId": "offer-uuid",
    "status": "accepted",
    "counterAmountCents": 8000  // optional, for "countered"
  }
  ```

## Architecture Benefits

### Before (localStorage):
- ❌ Data lost on browser clear
- ❌ No cross-device sync
- ❌ Complex "mirroring" logic to write to peer's localStorage
- ❌ Race conditions and data inconsistencies
- ❌ No server-side validation

### After (Supabase):
- ✅ Data persisted in database
- ✅ Cross-device access (same account)
- ✅ Simple: write once, RLS handles visibility
- ✅ Atomic transactions via Postgres
- ✅ Server-side validation and security

## Performance

- **Polling**: Currently polls every 5-10 seconds for new messages
- **Optimization**: Can add Supabase Realtime subscriptions for instant updates:

```typescript
// In ThreadClientNew.tsx, add realtime subscription:
useEffect(() => {
  const supabase = supabaseBrowser();
  const channel = supabase
    .channel(`thread:${threadId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`,
      },
      (payload) => {
        // Add new message to state
        setMessages(prev => [...prev, payload.new]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [threadId]);
```

## Security

All endpoints require authentication via `Authorization: Bearer <token>` header.

RLS policies ensure:
- Users only see threads they participate in
- Users can only send messages in their threads
- Soft-deleted threads are hidden via RLS filter
- Offers can only be updated by participants

## Maintenance

### Archive Cleanup
Set up a cron job (e.g., daily) to purge old archived threads:

```sql
-- Run this in Supabase SQL Editor or via cron
SELECT archive_fully_deleted_threads();
```

Or create a Supabase Edge Function scheduled to run daily.

### Monitoring
Check thread and message counts:

```sql
SELECT COUNT(*) FROM threads;
SELECT COUNT(*) FROM messages;
SELECT COUNT(*) FROM thread_deletions;
```

## Rollback Plan

If issues arise, you can temporarily revert by:

1. Restoring old component imports in:
   - `src/app/messages/page.tsx`
   - `src/app/messages/[id]/page.tsx`
   - `src/app/listing/[id]/page.tsx`

2. The old localStorage-based system is still in the codebase:
   - `src/lib/chatStore.ts`
   - `src/components/ThreadClient.tsx`
   - `src/components/MakeOfferButton.tsx`

3. Database tables remain; no data is lost

## Next Steps

1. **Run SQL migration** in Supabase
2. **Update component imports** as shown above
3. **Test end-to-end** with two user accounts
4. **Deploy** to production
5. **Monitor** for errors and performance
6. **Add realtime subscriptions** for instant updates (optional)
7. **Clean up old code** after confidence in new system:
   - Remove `src/lib/chatStore.ts`
   - Remove old `ThreadClient.tsx` and `MakeOfferButton.tsx`
   - Remove localStorage-based offer/message handling

## Support

If you encounter issues:
- Check browser console for API errors
- Check Supabase logs for RLS policy violations
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Ensure user is authenticated (check `Authorization` header in network tab)
