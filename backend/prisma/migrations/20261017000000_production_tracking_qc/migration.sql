-- Production tracking, per-run product identity, checklist snapshots and final QC.
CREATE TYPE "ProductionQcStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PASSED', 'FAILED');

ALTER TABLE "ProductionFlow"
  ADD COLUMN "requiresQc" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "qcAssigneeId" TEXT;

ALTER TABLE "ProductionFlowStep"
  ADD COLUMN "checklistTemplate" JSONB;

ALTER TABLE "ProductionRun"
  ADD COLUMN "productName" TEXT,
  ADD COLUMN "productCode" TEXT,
  ADD COLUMN "serialNumber" TEXT,
  ADD COLUMN "batchNumber" TEXT,
  ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "dueDate" TIMESTAMP(3),
  ADD COLUMN "qcStatus" "ProductionQcStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "qcAssigneeId" TEXT,
  ADD COLUMN "qcReviewerId" TEXT,
  ADD COLUMN "qcNotes" TEXT,
  ADD COLUMN "qcReviewedAt" TIMESTAMP(3);

-- Keep old production runs valid: use the historical run title as product name.
UPDATE "ProductionRun" SET "productName" = "title" WHERE "productName" IS NULL;
ALTER TABLE "ProductionRun" ALTER COLUMN "productName" SET NOT NULL;

ALTER TABLE "ProductionRunStep"
  ADD COLUMN "checklist" JSONB;

CREATE UNIQUE INDEX "ProductionRun_serialNumber_key" ON "ProductionRun"("serialNumber");
CREATE INDEX "ProductionRun_serialNumber_idx" ON "ProductionRun"("serialNumber");
CREATE INDEX "ProductionRun_batchNumber_idx" ON "ProductionRun"("batchNumber");
CREATE INDEX "ProductionRun_qcStatus_idx" ON "ProductionRun"("qcStatus");

ALTER TABLE "ProductionFlow"
  ADD CONSTRAINT "ProductionFlow_qcAssigneeId_fkey"
  FOREIGN KEY ("qcAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductionRun"
  ADD CONSTRAINT "ProductionRun_qcAssigneeId_fkey"
  FOREIGN KEY ("qcAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductionRun_qcReviewerId_fkey"
  FOREIGN KEY ("qcReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
