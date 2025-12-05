# ThreadClient Migration - Quick Summary

## The Problem
Messages sent by OfferMessage component go to the database via API, but ThreadClient only displays messages from localStorage (chatStore). This means:
- **Sender sees messages** (chatStore gets updated locally)
- **Recipient doesn't see messages** (their chatStore is never updated - messages are in database!)

## The Solution
Migrate ThreadClient to fetch messages from the API instead of localStorage.

---

## What Changes

### Current Flow (Broken)
```
User A clicks "Accept"
  ↓
OfferMessage.accept() 
  ↓
sendMessage() API call → Saved to database
updateOfferStatusAPI() API call → Offer updated in database
  ↓
⚠️ ThreadClient (User A) shows message via localStorage
⚠️ ThreadClient (User B) sees nothing - their localStorage wasn't updated!
```

### New Flow (Fixed)
```
User A clicks "Accept"
  ↓
OfferMessage.accept() 
  ↓
sendMessage() API call → Saved to database
updateOfferStatusAPI() API call → Offer updated in database
dispatchEvent("ms:threads") → Notify UI to refresh
  ↓
ThreadClient.fetchMessages(threadId) → Query API
  ↓
✅ ThreadClient (User A) fetches updated messages from API
✅ ThreadClient (User B) also fetches same messages from API
✅ Both see the same state!
```

---

## Implementation Overview

### Core Changes to ThreadClient.tsx

**Remove:**
```typescript
// OLD - All these use localStorage
import {
  loadThreads,
  appendMessage,
  deleteThread,
  getReadThreads,
  setReadThreads,
  // ...
} from "@/lib/chatStore";
```

**Add:**
```typescript
// NEW - All these use API
import {
  fetchMessages,
  fetchThreads,
  sendMessage,
} from "@/lib/messagesClient";
```

**Key State Changes:**
```typescript
// OLD
const [threads, setThreads] = useState<Thread[]>([]);
const thread = threads.find(t => t.id === threadId);
// Access messages directly: thread?.messages

// NEW
const [messages, setMessages] = useState<Message[]>([]);
const [thread, setThread] = useState<ThreadType | null>(null);
// Access messages from state: messages
```

**Effects to Add:**
```typescript
// Fetch messages when thread ID changes
useEffect(() => {
  if (!threadId) return;
  const messages = await fetchMessages(threadId);
  setMessages(messages);
}, [threadId]);

// Poll for new messages (keep updated)
useEffect(() => {
  const interval = setInterval(async () => {
    const messages = await fetchMessages(threadId);
    setMessages(messages);
  }, 3000);
  return () => clearInterval(interval);
}, [threadId]);

// Refresh when ms:threads event fires
useEffect(() => {
  window.addEventListener("ms:threads", refreshMessages);
  return () => window.removeEventListener("ms:threads", refreshMessages);
}, [threadId]);
```

**Function Changes:**
```typescript
// OLD
function send(text: string) {
  appendMessage(thread.id, { from: selfName, text, ts: nowClock() });
}

// NEW
async function send(text: string) {
  try {
    const message = await sendMessage(threadId, text);
    setMessages([...messages, message]);
  } catch (err) {
    alert("Send failed");
  }
}
```

---

## Why It's a Full Refactor

ThreadClient is **157 lines** of logic that directly depends on chatStore:
- `loadThreads()` - gets all threads
- `appendMessage()` - adds local message
- `getReadThreads()` - reads read status
- `setReadThreads()` - writes read status
- `deleteThread()` - deletes thread
- Local message grouping by timestamp

**All of this needs to change to use API equivalents.**

---

## Estimated Effort

| Task | Time |
|------|------|
| Code changes | 2-3 hours |
| Testing locally | 1-2 hours |
| Fix bugs found | 1-2 hours |
| Deploy & verify | 0.5-1 hour |
| **Total** | **~5-8 hours** |

---

## Why It's Worth It

**Current State (Broken):**
- User A accepts offer → Sees "accepted" message
- User B gets nothing → No notification, no message, no status update
- User B has to manually refresh page to see status change

**After Migration:**
- User A accepts offer → Sees "✅ accepted" message instantly
- User B's page updates automatically → Sees "✅ accepted" instantly  
- Unread badge updates for User B → They know something happened
- No manual refreshing needed → Real messaging experience

---

## Risk Level: **MEDIUM**

**What could break:**
- Message display (but we can test locally)
- Timestamp formatting (ISO strings vs milliseconds)
- Offer data structure compatibility (but already using new structure)
- Performance if polling is too frequent

**How to mitigate:**
- Keep chatStore intact (for fallback)
- Extensive local testing before deploy
- Deploy during low-traffic hours
- Monitor error logs after deploy

---

## Files Changed

**Must change:**
- `src/components/ThreadClient.tsx`

**May need updates:**
- `src/lib/messagesClient.ts` (add helper functions if needed)
- `src/app/api/messages/[threadId]/route.ts` (verify all data needed is returned)

**Not touched:**
- `src/lib/chatStore.ts` (still used by other components)
- `src/components/OfferMessage.tsx` (already correct)
- Database schema (no changes needed)

---

## Next Steps

1. **Read full plan**: `THREADCLIENT_MIGRATION_PLAN.md`
2. **Decide**: Implement now or defer?
3. **If implementing**:
   - Create branch: `feat/threadclient-api-migration`
   - Start with Phase 1: Add new state and effects for fetching
   - Test with two browsers side-by-side
   - Implement Phase 2-6
   - Deploy carefully

4. **If deferring**:
   - Current quick fix (ms:threads event dispatch) is active
   - Sender WILL see messages
   - Recipient will see messages only after F5 refresh
   - Full migration can happen later

---

## Questions?

- **How long is it cached?** Messages are fetched fresh each time (no caching layer)
- **What about offline?** Currently no offline support (could add later)
- **What about typing indicators?** Not implemented yet (could add in Phase 5)
- **Does it affect other components?** No - OfferMessage and ActiveOfferBar keep using their own patterns
- **Can we test it safely?** Yes - can deploy behind a flag or in staging first

