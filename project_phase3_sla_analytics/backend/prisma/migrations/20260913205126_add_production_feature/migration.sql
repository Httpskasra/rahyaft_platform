-- CreateEnum
CREATE TYPE "ProductionRunStatus" AS ENUM ('IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductionRunStepStatus" AS ENUM ('LOCKED', 'READY', 'IN_PROGRESS', 'WAITING_SUPERVISOR', 'WAITING_APPROVAL', 'NEEDS_REVISION', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ProductionReviewType" AS ENUM ('SUPERVISOR', 'APPROVER');

-- CreateEnum
CREATE TYPE "ProductionReviewAction" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ProductionFlow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionFlowStep" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "formId" TEXT NOT NULL,
    "assigneeUserId" TEXT NOT NULL,
    "supervisorUserId" TEXT,
    "approverUserId" TEXT,
    "estimatedMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionFlowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionRun" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "status" "ProductionRunStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "currentStepOrder" INTEGER,
    "startedById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionRunStep" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "flowStepId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "formId" TEXT NOT NULL,
    "assigneeUserId" TEXT NOT NULL,
    "supervisorUserId" TEXT,
    "approverUserId" TEXT,
    "status" "ProductionRunStepStatus" NOT NULL DEFAULT 'LOCKED',
    "submissionId" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionRunStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionStepReview" (
    "id" TEXT NOT NULL,
    "runStepId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "type" "ProductionReviewType" NOT NULL,
    "action" "ProductionReviewAction" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionStepReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionFlow_code_key" ON "ProductionFlow"("code");

-- CreateIndex
CREATE INDEX "ProductionFlow_createdById_idx" ON "ProductionFlow"("createdById");

-- CreateIndex
CREATE INDEX "ProductionFlow_isActive_idx" ON "ProductionFlow"("isActive");

-- CreateIndex
CREATE INDEX "ProductionFlowStep_formId_idx" ON "ProductionFlowStep"("formId");

-- CreateIndex
CREATE INDEX "ProductionFlowStep_assigneeUserId_idx" ON "ProductionFlowStep"("assigneeUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionFlowStep_flowId_stepOrder_key" ON "ProductionFlowStep"("flowId", "stepOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionRun_referenceNo_key" ON "ProductionRun"("referenceNo");

-- CreateIndex
CREATE INDEX "ProductionRun_flowId_status_idx" ON "ProductionRun"("flowId", "status");

-- CreateIndex
CREATE INDEX "ProductionRun_startedById_idx" ON "ProductionRun"("startedById");

-- CreateIndex
CREATE INDEX "ProductionRun_updatedAt_idx" ON "ProductionRun"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionRunStep_submissionId_key" ON "ProductionRunStep"("submissionId");

-- CreateIndex
CREATE INDEX "ProductionRunStep_assigneeUserId_status_idx" ON "ProductionRunStep"("assigneeUserId", "status");

-- CreateIndex
CREATE INDEX "ProductionRunStep_supervisorUserId_status_idx" ON "ProductionRunStep"("supervisorUserId", "status");

-- CreateIndex
CREATE INDEX "ProductionRunStep_approverUserId_status_idx" ON "ProductionRunStep"("approverUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionRunStep_runId_stepOrder_key" ON "ProductionRunStep"("runId", "stepOrder");

-- CreateIndex
CREATE INDEX "ProductionStepReview_runStepId_createdAt_idx" ON "ProductionStepReview"("runStepId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductionStepReview_reviewerId_idx" ON "ProductionStepReview"("reviewerId");

-- CreateIndex
CREATE INDEX "RecruitmentFormTemplate_type_isActive_idx" ON "RecruitmentFormTemplate"("type", "isActive");

-- AddForeignKey
ALTER TABLE "ProductionFlow" ADD CONSTRAINT "ProductionFlow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionFlowStep" ADD CONSTRAINT "ProductionFlowStep_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "ProductionFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionFlowStep" ADD CONSTRAINT "ProductionFlowStep_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionFlowStep" ADD CONSTRAINT "ProductionFlowStep_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionFlowStep" ADD CONSTRAINT "ProductionFlowStep_supervisorUserId_fkey" FOREIGN KEY ("supervisorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionFlowStep" ADD CONSTRAINT "ProductionFlowStep_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "ProductionFlow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRunStep" ADD CONSTRAINT "ProductionRunStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRunStep" ADD CONSTRAINT "ProductionRunStep_flowStepId_fkey" FOREIGN KEY ("flowStepId") REFERENCES "ProductionFlowStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRunStep" ADD CONSTRAINT "ProductionRunStep_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRunStep" ADD CONSTRAINT "ProductionRunStep_supervisorUserId_fkey" FOREIGN KEY ("supervisorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRunStep" ADD CONSTRAINT "ProductionRunStep_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRunStep" ADD CONSTRAINT "ProductionRunStep_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FormSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionStepReview" ADD CONSTRAINT "ProductionStepReview_runStepId_fkey" FOREIGN KEY ("runStepId") REFERENCES "ProductionRunStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionStepReview" ADD CONSTRAINT "ProductionStepReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
