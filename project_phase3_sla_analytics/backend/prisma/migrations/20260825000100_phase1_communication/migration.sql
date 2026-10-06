CREATE TYPE "ThreadType" AS ENUM ('CONVERSATION', 'REQUEST', 'TASK', 'REFERRAL', 'ANNOUNCEMENT', 'CASE');
CREATE TYPE "ThreadStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED', 'ARCHIVED');
CREATE TYPE "ThreadPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "ThreadParticipantRole" AS ENUM ('OWNER', 'ASSIGNEE', 'PARTICIPANT', 'WATCHER');
CREATE TYPE "ThreadActivityType" AS ENUM ('THREAD_CREATED', 'MESSAGE_SENT', 'USER_ADDED', 'USER_REMOVED', 'ASSIGNEE_ADDED', 'ASSIGNEE_REMOVED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'DUE_DATE_CHANGED', 'THREAD_UPDATED');

CREATE TABLE "Thread" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ThreadType" NOT NULL,
    "status" "ThreadStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "ThreadPriority" NOT NULL DEFAULT 'NORMAL',
    "creatorId" TEXT NOT NULL,
    "departmentId" TEXT,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ThreadParticipant" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ThreadParticipantRole" NOT NULL DEFAULT 'PARTICIPANT',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "lastReadAt" TIMESTAMP(3),
    CONSTRAINT "ThreadParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ThreadAssignment" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "ThreadAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ThreadMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ThreadMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ThreadActivity" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "ThreadActivityType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ThreadActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Thread_status_idx" ON "Thread"("status");
CREATE INDEX "Thread_creatorId_idx" ON "Thread"("creatorId");
CREATE INDEX "Thread_departmentId_idx" ON "Thread"("departmentId");
CREATE INDEX "Thread_updatedAt_idx" ON "Thread"("updatedAt");
CREATE UNIQUE INDEX "ThreadParticipant_threadId_userId_key" ON "ThreadParticipant"("threadId", "userId");
CREATE INDEX "ThreadParticipant_userId_leftAt_idx" ON "ThreadParticipant"("userId", "leftAt");
CREATE UNIQUE INDEX "ThreadAssignment_threadId_userId_key" ON "ThreadAssignment"("threadId", "userId");
CREATE INDEX "ThreadAssignment_userId_completedAt_idx" ON "ThreadAssignment"("userId", "completedAt");
CREATE INDEX "ThreadMessage_threadId_createdAt_idx" ON "ThreadMessage"("threadId", "createdAt");
CREATE INDEX "ThreadActivity_threadId_createdAt_idx" ON "ThreadActivity"("threadId", "createdAt");

ALTER TABLE "Thread" ADD CONSTRAINT "Thread_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ThreadParticipant" ADD CONSTRAINT "ThreadParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThreadParticipant" ADD CONSTRAINT "ThreadParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThreadAssignment" ADD CONSTRAINT "ThreadAssignment_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThreadAssignment" ADD CONSTRAINT "ThreadAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ThreadAssignment" ADD CONSTRAINT "ThreadAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ThreadMessage" ADD CONSTRAINT "ThreadMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThreadMessage" ADD CONSTRAINT "ThreadMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ThreadActivity" ADD CONSTRAINT "ThreadActivity_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThreadActivity" ADD CONSTRAINT "ThreadActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
