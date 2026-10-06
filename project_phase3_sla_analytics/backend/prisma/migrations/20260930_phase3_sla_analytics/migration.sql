-- Phase 3: configurable SLA for form approval workflows and repairs
ALTER TABLE "ApprovalPolicy" ADD COLUMN "overallSlaHours" INTEGER;
ALTER TABLE "ApprovalStep" ADD COLUMN "slaHours" INTEGER;
ALTER TABLE "ApprovalInstance" ADD COLUMN "overallSlaHours" INTEGER;
ALTER TABLE "ApprovalInstance" ADD COLUMN "overallDueAt" TIMESTAMP(3);
ALTER TABLE "ApprovalInstance" ADD COLUMN "stepSlaConfig" JSONB;

CREATE TABLE "RepairSlaPolicy" (
    "id" TEXT NOT NULL,
    "type" "RepairType" NOT NULL,
    "targetHours" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RepairSlaPolicy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RepairSlaPolicy_type_key" ON "RepairSlaPolicy"("type");
ALTER TABLE "RepairSla" ADD CONSTRAINT "RepairSla_repairCaseId_fkey" FOREIGN KEY ("repairCaseId") REFERENCES "RepairCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
