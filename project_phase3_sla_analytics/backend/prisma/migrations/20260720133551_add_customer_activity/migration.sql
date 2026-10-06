-- CreateEnum
CREATE TYPE "CustomerActivityType" AS ENUM ('NOTE', 'CALL', 'SMS', 'VISIT', 'FOLLOW_UP', 'CUSTOMER_CREATED', 'CUSTOMER_UPDATED', 'CONTACT_CREATED', 'CONTACT_UPDATED', 'CONTACT_DELETED', 'SALES_OPPORTUNITY_CREATED', 'SALES_OPPORTUNITY_UPDATED', 'SALES_OPPORTUNITY_DELETED', 'REPAIR_CREATED', 'REPAIR_STATUS_CHANGED', 'AI_ANALYSIS_UPDATED');

-- CreateTable
CREATE TABLE "CustomerActivity" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "CustomerActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "relatedRepairId" TEXT,
    "relatedSalesOpportunityId" TEXT,
    "dueAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerActivity_customerId_idx" ON "CustomerActivity"("customerId");

-- CreateIndex
CREATE INDEX "CustomerActivity_type_idx" ON "CustomerActivity"("type");

-- CreateIndex
CREATE INDEX "CustomerActivity_createdAt_idx" ON "CustomerActivity"("createdAt");

-- CreateIndex
CREATE INDEX "CustomerActivity_dueAt_idx" ON "CustomerActivity"("dueAt");

-- CreateIndex
CREATE INDEX "CustomerActivity_relatedRepairId_idx" ON "CustomerActivity"("relatedRepairId");

-- CreateIndex
CREATE INDEX "CustomerActivity_relatedSalesOpportunityId_idx" ON "CustomerActivity"("relatedSalesOpportunityId");

-- AddForeignKey
ALTER TABLE "CustomerActivity" ADD CONSTRAINT "CustomerActivity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
