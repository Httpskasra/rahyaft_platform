CREATE TABLE "ThreadMention" ("id" TEXT NOT NULL, "messageId" TEXT NOT NULL, "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ThreadMention_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "ThreadMention_messageId_userId_key" ON "ThreadMention"("messageId","userId");
CREATE INDEX "ThreadMention_userId_createdAt_idx" ON "ThreadMention"("userId","createdAt");
ALTER TABLE "ThreadMention" ADD CONSTRAINT "ThreadMention_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ThreadMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThreadMention" ADD CONSTRAINT "ThreadMention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ThreadAttachment" ("id" TEXT NOT NULL, "threadId" TEXT NOT NULL, "messageId" TEXT, "uploaderId" TEXT NOT NULL, "fileName" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "size" INTEGER NOT NULL, "storageKey" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ThreadAttachment_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "ThreadAttachment_storageKey_key" ON "ThreadAttachment"("storageKey");
CREATE INDEX "ThreadAttachment_threadId_createdAt_idx" ON "ThreadAttachment"("threadId","createdAt");
CREATE INDEX "ThreadAttachment_messageId_idx" ON "ThreadAttachment"("messageId");
ALTER TABLE "ThreadAttachment" ADD CONSTRAINT "ThreadAttachment_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThreadAttachment" ADD CONSTRAINT "ThreadAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ThreadMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThreadAttachment" ADD CONSTRAINT "ThreadAttachment_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CommunicationNotification" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "threadId" TEXT NOT NULL, "type" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT, "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CommunicationNotification_pkey" PRIMARY KEY ("id"));
CREATE INDEX "CommunicationNotification_userId_readAt_createdAt_idx" ON "CommunicationNotification"("userId","readAt","createdAt");
CREATE INDEX "CommunicationNotification_threadId_createdAt_idx" ON "CommunicationNotification"("threadId","createdAt");
ALTER TABLE "CommunicationNotification" ADD CONSTRAINT "CommunicationNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationNotification" ADD CONSTRAINT "CommunicationNotification_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
