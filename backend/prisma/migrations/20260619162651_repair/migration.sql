-- CreateEnum
CREATE TYPE "RepairType" AS ENUM ('IN_HOUSE', 'ON_SITE');

-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('REGISTERED', 'WAITING_REVIEW', 'WAITING_COST_APPROVAL', 'APPROVED', 'REJECTED', 'IN_REPAIR', 'QC', 'READY_FOR_DELIVERY', 'DELIVERED', 'CLOSED', 'CANCELED', 'NO_REPAIR_REQUIRED');

-- CreateEnum
CREATE TYPE "VisitResult" AS ENUM ('REPAIRED', 'NEED_SECOND_VISIT', 'NEED_PART', 'CUSTOMER_ABSENT', 'CANCELED');

-- CreateTable
CREATE TABLE "RepairCase" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "RepairType" NOT NULL,
    "status" "RepairStatus" NOT NULL,
    "technicianId" TEXT,
    "description" TEXT,
    "needCostApproval" BOOLEAN NOT NULL DEFAULT false,
    "estimatedCost" DECIMAL(12,2),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deviceTitle" TEXT NOT NULL,
    "serialNumber" TEXT,
    "problemDescription" TEXT NOT NULL,

    CONSTRAINT "RepairCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairItem" (
    "id" TEXT NOT NULL,
    "repairCaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairVisit" (
    "id" TEXT NOT NULL,
    "repairCaseId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "visitedAt" TIMESTAMP(3),
    "notes" TEXT,
    "result" "VisitResult" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairStatusLog" (
    "id" TEXT NOT NULL,
    "repairCaseId" TEXT NOT NULL,
    "oldStatus" "RepairStatus",
    "newStatus" "RepairStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairSla" (
    "id" TEXT NOT NULL,
    "repairCaseId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "isBreached" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RepairSla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationEvent" (
    "id" TEXT NOT NULL,
    "repairCaseId" TEXT NOT NULL,
    "status" "RepairStatus" NOT NULL,
    "payload" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "companyName" TEXT,
    "nationalCode" TEXT,
    "address" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RepairCase_caseNumber_key" ON "RepairCase"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RepairSla_repairCaseId_key" ON "RepairSla"("repairCaseId");

-- AddForeignKey
ALTER TABLE "RepairCase" ADD CONSTRAINT "RepairCase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairCase" ADD CONSTRAINT "RepairCase_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairItem" ADD CONSTRAINT "RepairItem_repairCaseId_fkey" FOREIGN KEY ("repairCaseId") REFERENCES "RepairCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairVisit" ADD CONSTRAINT "RepairVisit_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairVisit" ADD CONSTRAINT "RepairVisit_repairCaseId_fkey" FOREIGN KEY ("repairCaseId") REFERENCES "RepairCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairStatusLog" ADD CONSTRAINT "RepairStatusLog_repairCaseId_fkey" FOREIGN KEY ("repairCaseId") REFERENCES "RepairCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairStatusLog" ADD CONSTRAINT "RepairStatusLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
