# Messaging System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Messages    │    │   Thread     │    │ Make Offer   │      │
│  │    Page      │    │   Client     │    │    Button    │      │
│  │              │    │              │    │              │      │
│  │  Inbox List  │───>│  Chat View   │    │ Offer Modal  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                    │                    │              │
│         └────────────────────┴────────────────────┘              │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │                   │                        │
│                    │  messagesClient   │                        │
│                    │    (API Wrapper)  │                        │
│                    │                   │                        │
│                    └─────────┬─────────┘                        │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                    HTTP + Auth Header
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                          API LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │ /api/messages/     │  │ /api/offers/new    │                │
│  │                    │  │                    │                │
│  │  • threads         │  │  • GET (list)      │                │
│  │  • [threadId]      │  │  • POST (create)   │                │
│  │  • read            │  │  • PATCH (update)  │                │
│  └────────────────────┘  └────────────────────┘                │
│            │                        │                            │
│            └────────────┬───────────┘                            │
│                         │                                        │
│               ┌─────────▼─────────┐                             │
│               │  Supabase Client  │                             │
│               │  (with auth)      │                             │
│               └─────────┬─────────┘                             │
└─────────────────────────┼──────────────────────────────────────┘
                          │
                  Authenticated Query
                          │
┌─────────────────────────▼──────────────────────────────────────┐
│                      DATABASE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                      Supabase (Postgres)                         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   threads    │  │   messages   │  │    offers    │          │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤          │
│  │ • id         │  │ • id         │  │ • id         │          │
│  │ • part_1_id  │──│ • thread_id  │  │ • thread_id  │          │
│  │ • part_2_id  │  │ • from_id    │  │ • starter_id │          │
│  │ • listing    │  │ • type       │  │ • recipient  │          │
│  │ • last_msg   │  │ • text       │  │ • amount     │          │
│  └──────────────┘  │ • offer_id   │  │ • status     │          │
│                    └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │ thread_deletions│  │ thread_read_    │                      │
│  │                 │  │    status       │                      │
│  ├─────────────────┤  ├─────────────────┤                      │
│  │ • thread_id     │  │ • thread_id     │                      │
│  │ • user_id       │  │ • user_id       │                      │
│  │ • deleted_at    │  │ • last_read_at  │                      │
│  └─────────────────┘  └─────────────────┘                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐        │
│  │             ROW LEVEL SECURITY (RLS)                │        │
│  │                                                      │        │
│  │  • Users see only their threads (participant_*_id)  │        │
│  │  • Soft-deleted threads hidden via RLS filter       │        │
│  │  • Messages filtered by thread access               │        │
│  │  • Offers visible only to starter/recipient         │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### 1. User Opens Messages Inbox

```
User Browser
    │
    │ Click "Messages"
    ▼
Messages Page Component
    │
    │ useEffect: fetchThreads()
    ▼
messagesClient.fetchThreads()
    │
    │ GET /api/messages/threads
    │ Authorization: Bearer <token>
    ▼
API Route: threads/route.ts
    │
    │ supabase.auth.getUser() → verify
    │ supabase.from('threads').select()
    ▼
Supabase RLS Filter
    │
    │ WHERE auth.uid() IN (participant_1_id, participant_2_id)
    │   AND NOT EXISTS (thread_deletions for this user)
    ▼
Return threads with peer info
    │
    ▼
Component renders inbox list
```

### 2. User Makes an Offer

```
User Browser
    │
    │ Click "Make an offer"
    ▼
MakeOfferButtonNew
    │
    │ Enter amount, click "Send"
    ▼
1. createThread(sellerId, listingId)
    │
    │ POST /api/messages/threads
    │ Body: { peerId, listingRef }
    ▼
API creates/gets thread
    │ Inserts: threads(id, participant_1_id, participant_2_id, listing_ref)
    │
    ▼
2. createOffer({ threadId, recipientId, amountCents, ... })
    │
    │ POST /api/offers/new
    ▼
API creates offer
    │ Inserts: offers(thread_id, listing_id, starter_id, recipient_id, amount_cents, status)
    │ Inserts: messages(type='system', text='Started an offer')
    │ Inserts: messages(type='offer', offer_id=..., offer_status='pending')
    │ Updates: threads.last_message_text, threads.last_message_at
    │
    ▼
3. Navigate to thread
    │
    │ router.push('/messages/{threadId}')
    ▼
ThreadClientNew loads messages
    │
    │ fetchMessages(threadId)
    ▼
User sees offer in chat
```

### 3. Peer Views Offer (Different Browser/Device)

```
Seller Browser (User 2)
    │
    │ Navigate to /messages
    ▼
fetchThreads()
    │
    │ GET /api/messages/threads
    ▼
Supabase RLS returns threads where:
    auth.uid() = participant_1_id OR participant_2_id
    │
    │ Finds thread with Buyer (User 1)
    ▼
Inbox shows unread thread
    │
    │ Click thread
    ▼
fetchMessages(threadId)
    │
    │ GET /api/messages/{threadId}
    ▼
Supabase RLS allows if:
    User is participant of thread
    Thread not soft-deleted by this user
    │
    ▼
Seller sees offer from Buyer
```

### 4. User Soft-Deletes Thread

```
User Browser
    │
    │ Click "Delete"
    ▼
deleteThread(threadId)
    │
    │ DELETE /api/messages/{threadId}
    ▼
API Route
    │
    │ Inserts: thread_deletions(thread_id, user_id, deleted_at)
    ▼
Supabase
    │
    │ Record created
    ▼
Next fetchThreads() call
    │
    │ RLS filter applies:
    │   AND NOT EXISTS (thread_deletions WHERE user_id = auth.uid())
    ▼
Thread hidden from this user's inbox
(but still visible to peer)
```

### 5. Permanent Archive (After Both Delete)

```
Cron Job (scheduled)
    │
    │ SELECT archive_fully_deleted_threads()
    ▼
Function Logic
    │
    │ Find threads WHERE:
    │   Both participant_1_id AND participant_2_id
    │   have rows in thread_deletions
    │   AND both deleted_at > 30 days ago
    ▼
DELETE FROM threads WHERE id IN (...)
    │
    │ Cascade deletes:
    │   • messages (FK constraint)
    │   • thread_deletions (FK constraint)
    │   • thread_read_status (FK constraint)
    │   • offers (FK constraint)
    ▼
Archived threads permanently removed
```

## Security Flow

```
HTTP Request
    │
    │ Must include: Authorization: Bearer <access_token>
    ▼
API Route validates auth
    │
    │ const { data: { user } } = await supabase.auth.getUser()
    │ if (!user) return 401
    ▼
Query executed with user context
    │
    │ Supabase uses JWT to set auth.uid()
    ▼
RLS Policies evaluate per row
    │
    │ threads: auth.uid() IN (participant_1_id, participant_2_id)
    │ messages: EXISTS(thread WHERE user is participant)
    │ offers: auth.uid() IN (starter_id, recipient_id)
    ▼
Only matching rows returned/modified
```

## Performance Considerations

### Current: Polling
- Threads: Poll every 10 seconds
- Messages: Poll every 5 seconds
- Simple, works cross-tab

### Future: Realtime
```javascript
const channel = supabase
  .channel(`thread:${threadId}`)
  .on('postgres_changes', { event: 'INSERT', table: 'messages' }, 
    (payload) => setMessages(prev => [...prev, payload.new])
  )
  .subscribe();
```

Benefits:
- Instant updates
- Lower server load
- Better UX

## Key Design Decisions

1. **Thread IDs are slugified names** - `t_user1_user2_listingId`
   - Human-readable
   - Deterministic (same users + listing = same thread)
   - Enables client-side thread ID generation before API call

2. **Participants stored as ordered UUIDs**
   - `participant_1_id < participant_2_id` (constraint)
   - Ensures uniqueness
   - Efficient indexing

3. **Soft deletes via separate table**
   - `thread_deletions(thread_id, user_id)`
   - Doesn't modify threads table
   - Easy to restore
   - RLS filter hides deleted threads

4. **Messages include offer data inline**
   - Offers stored separately + embedded in message
   - Enables offer updates to propagate to message view
   - Single query gets full conversation

5. **RLS for all security**
   - No custom authorization logic in API
   - Database enforces access control
   - Can't be bypassed by buggy API code

This architecture ensures messages are persistent, secure, isolated by user, and support soft deletes with archival.
