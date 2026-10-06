-- CreateEnum
CREATE TYPE "AiInsightLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "CustomerAiAnalysis" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "riskLevel" "AiInsightLevel",
    "salesPotential" "AiInsightLevel",
    "nextBestAction" TEXT,
    "tags" JSONB,
    "insights" JSONB,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "modelName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAiAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerAiAnalysis_customerId_idx" ON "CustomerAiAnalysis"("customerId");

-- CreateIndex
CREATE INDEX "CustomerAiAnalysis_riskLevel_idx" ON "CustomerAiAnalysis"("riskLevel");

-- CreateIndex
CREATE INDEX "CustomerAiAnalysis_salesPotential_idx" ON "CustomerAiAnalysis"("salesPotential");

-- CreateIndex
CREATE INDEX "CustomerAiAnalysis_createdAt_idx" ON "CustomerAiAnalysis"("createdAt");

-- AddForeignKey
ALTER TABLE "CustomerAiAnalysis" ADD CONSTRAINT "CustomerAiAnalysis_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
