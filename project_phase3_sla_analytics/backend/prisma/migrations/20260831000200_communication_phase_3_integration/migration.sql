CREATE TYPE "ThreadEntityType" AS ENUM ('CUSTOMER','REPAIR','FORM','FORM_SUBMISSION','SALES_OPPORTUNITY','USER','DEPARTMENT');
ALTER TYPE "ThreadActivityType" ADD VALUE IF NOT EXISTS 'ENTITY_LINKED';
ALTER TYPE "ThreadActivityType" ADD VALUE IF NOT EXISTS 'ENTITY_UNLINKED';
CREATE TABLE "ThreadEntityLink" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "entityType" "ThreadEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "subtitle" TEXT,
  "href" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ThreadEntityLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ThreadEntityLink_threadId_entityType_entityId_key" ON "ThreadEntityLink"("threadId","entityType","entityId");
CREATE INDEX "ThreadEntityLink_entityType_entityId_idx" ON "ThreadEntityLink"("entityType","entityId");
CREATE INDEX "ThreadEntityLink_threadId_createdAt_idx" ON "ThreadEntityLink"("threadId","createdAt");
ALTER TABLE "ThreadEntityLink" ADD CONSTRAINT "ThreadEntityLink_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThreadEntityLink" ADD CONSTRAINT "ThreadEntityLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
