-- Phase 3 SLA analytics
ALTER TABLE "Form" ADD COLUMN "slaHours" INTEGER;
ALTER TABLE "ApprovalStep" ADD COLUMN "slaHours" INTEGER;
ALTER TABLE "RepairSla" ADD COLUMN "targetHours" INTEGER;
ALTER TABLE "RepairSla" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "RepairSla" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "RepairSla" AS s SET "targetHours" = GREATEST(1, CEIL(EXTRACT(EPOCH FROM (s."dueAt" - r."createdAt")) / 3600.0)::INTEGER) FROM "RepairCase" AS r WHERE s."repairCaseId" = r."id" AND s."targetHours" IS NULL;
ALTER TABLE "RepairSla" ALTER COLUMN "targetHours" SET NOT NULL;
ALTER TABLE "RepairSla" ADD CONSTRAINT "RepairSla_repairCaseId_fkey" FOREIGN KEY ("repairCaseId") REFERENCES "RepairCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
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
