ALTER TABLE "ThreadMessage" ADD COLUMN "clientId" TEXT;
ALTER TABLE "ThreadMessage" ADD COLUMN "replyToId" TEXT;
CREATE INDEX "ThreadMessage_replyToId_idx" ON "ThreadMessage"("replyToId");
CREATE UNIQUE INDEX "ThreadMessage_senderId_clientId_key" ON "ThreadMessage"("senderId", "clientId");
ALTER TABLE "ThreadMessage" ADD CONSTRAINT "ThreadMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ThreadMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
