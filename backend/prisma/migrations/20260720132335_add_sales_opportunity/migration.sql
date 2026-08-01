-- CreateEnum
CREATE TYPE "SalesOpportunityStatus" AS ENUM ('NEW', 'CONTACTED', 'NEEDS_QUOTE', 'QUOTED', 'NEGOTIATION', 'WON', 'LOST', 'CANCELED');

-- CreateEnum
CREATE TYPE "SalesOpportunityPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "SalesOpportunity" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "SalesOpportunityStatus" NOT NULL DEFAULT 'NEW',
    "priority" "SalesOpportunityPriority" NOT NULL DEFAULT 'MEDIUM',
    "estimatedValue" DECIMAL(12,2),
    "probability" INTEGER DEFAULT 0,
    "expectedCloseAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "lossReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesOpportunity_customerId_idx" ON "SalesOpportunity"("customerId");

-- CreateIndex
CREATE INDEX "SalesOpportunity_status_idx" ON "SalesOpportunity"("status");

-- CreateIndex
CREATE INDEX "SalesOpportunity_priority_idx" ON "SalesOpportunity"("priority");

-- CreateIndex
CREATE INDEX "SalesOpportunity_nextFollowUpAt_idx" ON "SalesOpportunity"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "SalesOpportunity_expectedCloseAt_idx" ON "SalesOpportunity"("expectedCloseAt");

-- AddForeignKey
ALTER TABLE "SalesOpportunity" ADD CONSTRAINT "SalesOpportunity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
