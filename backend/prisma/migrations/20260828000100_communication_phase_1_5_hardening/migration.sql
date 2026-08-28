-- Phase 1.5: preserve full assignment history instead of reusing one row.
DROP INDEX IF EXISTS "ThreadAssignment_threadId_userId_key";
CREATE INDEX "ThreadAssignment_threadId_userId_completedAt_idx" ON "ThreadAssignment"("threadId", "userId", "completedAt");
