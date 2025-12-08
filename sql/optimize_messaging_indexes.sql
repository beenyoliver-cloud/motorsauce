-- Optimize messaging queries for better performance
-- Add indexes to speed up unread count queries

-- Index for thread participants lookup (used in unread count query)
CREATE INDEX IF NOT EXISTS idx_threads_participant_1 ON threads(participant_1_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_participant_2 ON threads(participant_2_id, last_message_at DESC);

-- Composite index for thread_read_status lookups (user_id + thread_id)
CREATE INDEX IF NOT EXISTS idx_thread_read_status_user_thread ON thread_read_status(user_id, thread_id);

-- Index for thread_deletions lookups
CREATE INDEX IF NOT EXISTS idx_thread_deletions_user_thread ON thread_deletions(user_id, thread_id);

-- Index for messages by thread (for polling/real-time updates)
CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON messages(thread_id, created_at DESC);

-- Analyze tables to update query planner statistics
ANALYZE threads;
ANALYZE thread_read_status;
ANALYZE thread_deletions;
ANALYZE messages;
