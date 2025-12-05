# ThreadClient Migration Plan: localStorage → API

**Status**: Plan Document  
**Scope**: Migrate `ThreadClient.tsx` from `chatStore` (localStorage) to `messagesClient` (API-based)  
**Priority**: HIGH - Required for offer messaging to work correctly for all users

---

## 1. Problem Statement

**Current State:**
- ThreadClient uses old `chatStore` which stores all messages in browser localStorage
- OfferMessage component sends messages via API to database
- **RESULT**: Sender sees new messages (they trigger localStorage write via `appendMessage`), but recipient doesn't see them (their ThreadClient is only reading localStorage, which doesn't get updated when messages arrive from other users)

**Goal:**
- ThreadClient should fetch messages from API (like `/api/messages/[threadId]`)
- Messages should be real-time and bidirectional
- Both users can see messages, offers, and status updates

---

## 2. Data Structure Comparison

### OLD (chatStore)
```typescript
export type ChatMessage = {
  id?: string;
  from?: string;
  fromId?: string;
  text?: string;
  ts: number;                    // timestamp as milliseconds
  type?: "text" | "offer" | "system";
  offer?: OfferContent;
};

export type Thread = {
  id: string;
  participants: [string, string];
  self: string;                   // current user's name
  peer: string;                   // peer user's name
  peerAvatar?: string;
  participantsIds?: [string, string];
  selfId?: string;
  peerId?: string;
  messages: ChatMessage[];
  last: string;                   // last message text
  lastTs: number;                 // last message timestamp in ms
  listingRef?: string;
};
```

### NEW (messagesClient)
```typescript
export type Message = {
  id: string;
  threadId: string;
  from: {                          // user object instead of just name
    id: string;
    name: string;
    avatar?: string;
  };
  type: "text" | "offer" | "system" | "review";
  text?: string;
  offer?: {
    id: string;
    amountCents: number;
    currency: string;
    status: string;
    listingTitle?: string;
    listingImage?: string;
  };
  createdAt: string;              // ISO 8601 datetime string
  updatedAt: string;
};

export type Thread = {
  id: string;
  peer: {                          // peer as object
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  listingRef?: string | null;
  listing?: {
    id: string;
    title: string;
    image?: string | null;
  } | null;
  lastMessage?: string | null;
  lastMessageAt: string;           // ISO 8601 datetime string
  isRead: boolean;                 // single boolean instead of read list
  createdAt: string;
};
```

### Key Differences:
| Aspect | Old | New | Migration Step |
|--------|-----|-----|-----------------|
| **Thread ID** | `t_{slug1}_{slug2}` | UUID | Use existing threadId from API |
| **Timestamp** | `number` (ms) | `string` (ISO 8601) | Convert with `new Date(str).getTime()` |
| **Peer Info** | `string` (name only) | `object` (id, name, avatar) | Use `thread.peer.name` where needed |
| **Read Status** | Set of thread IDs in localStorage | `isRead` boolean on thread | Different approach needed |
| **Message Storage** | All in memory (`messages[]`) | Fetched from API | Fetch on demand |
| **Offers** | Embedded in message | Same | Same structure |

---

## 3. Key Functions to Replace/Refactor

### 3.1 Loading Threads
**Current:**
```typescript
loadThreads()  // → returns all threads from localStorage
```

**New:**
```typescript
fetchThreads()  // from messagesClient → returns Thread[] from API
```

**Required Changes:**
- Replace `loadThreads()` with `fetchThreads()` from messagesClient
- ThreadClient needs to call this on mount
- Need a refresh mechanism when new messages arrive

---

### 3.2 Loading Messages for a Thread
**Current:**
```typescript
const thread = threads.find((t) => t.id === threadId);
thread.messages  // already loaded
```

**New:**
```typescript
const messages = await fetchMessages(threadId)  // from messagesClient
```

**Required Changes:**
- Add state for `messages: Message[]`
- Add effect to fetch messages when threadId changes
- Need polling or real-time subscription to see new messages

---

### 3.3 Sending Messages
**Current:**
```typescript
function send(text: string) {
  appendMessage(thread.id, {
    id: `m_${Date.now()}`,
    from: selfName,
    ts: nowClock(),
    type: "text",
    text: text.trim(),
  });
}
```

**New:**
```typescript
async function send(text: string) {
  try {
    const message = await sendMessage(threadId, text);
    // Refresh thread messages
    setMessages([...messages, message]);
  } catch (err) {
    alert("Failed to send message");
  }
}
```

**Required Changes:**
- Use `sendMessage()` from messagesClient
- Add error handling
- Refresh messages list after send
- Add loading state during send

---

### 3.4 Marking Thread as Read
**Current:**
```typescript
function markAsRead() {
  const read = new Set(getReadThreads());
  read.add(thread.id);
  setReadThreads([...read]);
  publishUnread(threads, Array.from(read));
}
```

**New:**
```typescript
async function markAsRead() {
  // Call API to mark thread as read
  await fetch(`/api/messages/read`, {
    method: "POST",
    body: JSON.stringify({ threadId }),
  });
  // Update local state
  setThread({ ...thread, isRead: true });
}
```

**Required Changes:**
- Add API call to mark thread as read
- No longer need localStorage-based read tracking
- Simpler state management

---

### 3.5 Deleting Thread
**Current:**
```typescript
function handleDelete() {
  deleteThreadStore(thread.id);
  setThreads(loadThreads());
  router.push("/messages");
}
```

**New:**
```typescript
async function handleDelete() {
  try {
    await fetch(`/api/messages/${threadId}`, { method: "DELETE" });
    router.push("/messages");
  } catch (err) {
    alert("Failed to delete thread");
  }
}
```

**Required Changes:**
- Use existing DELETE endpoint
- Add error handling
- Simpler flow without localStorage

---

## 4. Migration Steps (Detailed)

### Phase 1: Add New API-Based Fetching
```tsx
// Add new state for API-based messages
const [messages, setMessages] = useState<Message[]>([]);
const [messagesLoading, setMessagesLoading] = useState(true);
const [messagesError, setMessagesError] = useState<string | null>(null);

// Add effect to fetch messages from API
useEffect(() => {
  if (!mounted || !threadId) return;
  
  (async () => {
    try {
      setMessagesLoading(true);
      const msgs = await fetchMessages(threadId);
      setMessages(msgs);
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setMessagesLoading(false);
    }
  })();
}, [mounted, threadId]);
```

### Phase 2: Update Message Display
Replace:
```tsx
{thread?.messages.map(...)}
```

With:
```tsx
{messages.map(...)}
```

Handle loading and error states.

### Phase 3: Update Send Function
Replace `appendMessage()` with `sendMessage()` API call:
```tsx
async function send(text: string) {
  if (!text.trim()) return;
  try {
    const newMessage = await sendMessage(threadId, text);
    setMessages([...messages, newMessage]);
    setInputValue("");
  } catch (err) {
    setError(err.message);
  }
}
```

### Phase 4: Update Read Status
Replace localStorage read tracking with API call:
```tsx
useEffect(() => {
  if (!mounted || !threadId) return;
  
  // Mark thread as read
  (async () => {
    try {
      const res = await fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId }),
      });
      if (res.ok) {
        // Update local thread state
        setThread(prev => prev ? { ...prev, isRead: true } : null);
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  })();
}, [mounted, threadId]);
```

### Phase 5: Add Polling/Real-Time Updates
Option A - Polling (simpler):
```tsx
useEffect(() => {
  if (!mounted || !threadId) return;
  
  const interval = setInterval(async () => {
    const msgs = await fetchMessages(threadId);
    setMessages(msgs);
  }, 3000);  // Poll every 3 seconds
  
  return () => clearInterval(interval);
}, [mounted, threadId]);
```

Option B - Event-based (better UX):
```tsx
// Listen for ms:threads event to refresh
useEffect(() => {
  const refresh = async () => {
    const msgs = await fetchMessages(threadId);
    setMessages(msgs);
  };
  
  window.addEventListener("ms:threads", refresh as EventListener);
  return () => window.removeEventListener("ms:threads", refresh as EventListener);
}, [threadId]);
```

### Phase 6: Remove chatStore Imports
Remove:
```tsx
import {
  appendMessage,
  getReadThreads,
  setReadThreads,
  nowClock,
  publishUnread,
  loadThreads,
  deleteThread as deleteThreadStore,
  // ...
} from "@/lib/chatStore";
```

Add:
```tsx
import {
  fetchMessages,
  fetchThreads,
  sendMessage,
} from "@/lib/messagesClient";
```

---

## 5. Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| **Real-time updates** | Use polling (3-5s interval) or event dispatch on new messages |
| **Type compatibility** | Create adapter functions to convert between old/new types |
| **Thread data** | Keep single fetch of thread data (peer info, listing info) |
| **Message grouping** | Group by date using `createdAt` (ISO string) instead of `ts` |
| **Backward compatibility** | Phase out chatStore gradually, keep until ThreadClient fully migrated |
| **Hydration issues** | Use same `mounted` pattern to ensure SSR compatibility |

---

## 6. Implementation Order

1. **Parallel approach** (Recommended):
   - ✅ Keep chatStore loading (for backward compatibility)
   - ✅ Add new API-based message fetching
   - ✅ Add switch to use API messages in rendering
   - ✅ Test both users can see messages
   - ✅ Remove chatStore imports once verified
   
2. **Sequential approach** (Safer):
   - Step 1: Add fetchMessages() effect
   - Step 2: Update message rendering to use `messages` state
   - Step 3: Update send() to use sendMessage() API
   - Step 4: Test thoroughly
   - Step 5: Remove chatStore

---

## 7. Testing Checklist

- [ ] User A sends text message → User B receives it immediately
- [ ] User B sends offer → User A sees offer card with all details
- [ ] User A accepts offer → System message "✅ accepted" appears for both
- [ ] User B counters → New offer appears for User A
- [ ] Message appears after F5 refresh
- [ ] Unread badge updates when new message arrives
- [ ] Typing indicator works (if implemented)
- [ ] Thread deletion works
- [ ] Multiple threads work independently
- [ ] Avatar/peer info displays correctly
- [ ] No console errors

---

## 8. Risk Assessment

**Low Risk:**
- Message sending (already using API in OfferMessage)
- Read status tracking (simpler with API)
- Thread deletion (DELETE endpoint exists)

**Medium Risk:**
- Real-time updates (polling works but not real-time)
- Type conversions (testable, straightforward)
- Backward compatibility (gradual deprecation)

**High Risk:**
- Breaking existing functionality during transition
- Performance if polling is too frequent
- Message ordering if not handled correctly

**Mitigation:**
- Keep feature behind flag initially
- Test thoroughly with concurrent users
- Implement gradually, test at each phase
- Keep chatStore for fallback initially

---

## 9. Estimated Effort

- **Planning & Analysis**: 2-3 hours (✅ Done)
- **Implementation**: 4-6 hours
  - Phase 1-2 (Add fetching & display): 1.5 hours
  - Phase 3 (Send function): 1 hour
  - Phase 4-5 (Read status & polling): 1.5 hours
  - Phase 6 (Cleanup): 0.5 hours
- **Testing & Debugging**: 3-4 hours
- **Deployment & Monitoring**: 1-2 hours

**Total**: ~10-15 hours

---

## 10. Next Steps

1. **Approve migration plan** - Is approach acceptable?
2. **Create feature branch** - `feat/threadclient-api-migration`
3. **Implement Phase 1-2** - Get basic API fetching working
4. **Local testing** - Verify types and rendering
5. **Deploy to staging** - Test with real database
6. **User testing** - Concurrent users test real-time behavior
7. **Merge to main** - After verification

---

## Files Affected

### Primary
- `src/components/ThreadClient.tsx` (MAJOR - complete refactor)

### Secondary (updates needed)
- `src/lib/messagesClient.ts` (may need new helpers)
- `src/components/OfferMessage.tsx` (already using API - verify compatibility)
- `src/app/messages/[id]/page.tsx` (passes threadId to ThreadClient)

### No changes needed
- `src/lib/chatStore.ts` (keep for other components using it)
- `src/components/ActiveOfferBar.tsx` (still uses chatStore)
- `src/components/OfferToast.tsx` (still uses chatStore)

---

## Success Criteria

✅ Both sender and recipient see messages in real-time  
✅ Offer actions (accept/decline/counter) show system messages for both users  
✅ Unread badge updates when messages arrive  
✅ No console errors or warnings  
✅ Performance acceptable (messages load < 2s, polling < 500ms)  
✅ Backward compatible with existing data in localStorage  

---

