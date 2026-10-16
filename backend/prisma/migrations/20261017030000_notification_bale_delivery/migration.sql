ALTER TABLE "AppNotification"
  ADD COLUMN "baleStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "baleAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "baleNextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "baleSentAt" TIMESTAMP(3),
  ADD COLUMN "baleLastError" TEXT;
CREATE INDEX "AppNotification_baleStatus_baleNextAttemptAt_idx" ON "AppNotification"("baleStatus", "baleNextAttemptAt");
