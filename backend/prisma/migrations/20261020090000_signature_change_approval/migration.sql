CREATE TYPE "SignatureChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "SignatureChangeRequest" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "status" "SignatureChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewComment" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SignatureChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SignatureChangeRequest_reviewerId_status_createdAt_idx" ON "SignatureChangeRequest"("reviewerId", "status", "createdAt");
CREATE INDEX "SignatureChangeRequest_requesterId_status_createdAt_idx" ON "SignatureChangeRequest"("requesterId", "status", "createdAt");

ALTER TABLE "SignatureChangeRequest" ADD CONSTRAINT "SignatureChangeRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SignatureChangeRequest" ADD CONSTRAINT "SignatureChangeRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
