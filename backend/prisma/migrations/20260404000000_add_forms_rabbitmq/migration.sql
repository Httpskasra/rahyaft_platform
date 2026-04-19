-- AddFormSubmission relation on User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "refreshToken" TEXT;

-- Create Form table
CREATE TABLE IF NOT EXISTS "Form" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "schema" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- Create FormSubmission table
CREATE TABLE IF NOT EXISTS "FormSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "formVersion" INTEGER NOT NULL,
    "userId" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- Create FormStat table
CREATE TABLE IF NOT EXISTS "FormStat" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FormStat_pkey" PRIMARY KEY ("id")
);

-- Create FormAnalysis table
CREATE TABLE IF NOT EXISTS "FormAnalysis" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "fieldId" TEXT,
    "metric" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'analytics-worker',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FormAnalysis_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey"
    FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FormStat" ADD CONSTRAINT "FormStat_formId_fkey"
    FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FormAnalysis" ADD CONSTRAINT "FormAnalysis_formId_fkey"
    FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "FormStat_formId_fieldId_metric_key"
    ON "FormStat"("formId", "fieldId", "metric");

CREATE UNIQUE INDEX IF NOT EXISTS "FormAnalysis_formId_fieldId_metric_key"
    ON "FormAnalysis"("formId", "fieldId", "metric");

CREATE INDEX IF NOT EXISTS "FormAnalysis_formId_idx" ON "FormAnalysis"("formId");
