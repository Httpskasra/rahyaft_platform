ALTER TABLE "User" ADD COLUMN "signatureStorageKey" TEXT;
ALTER TABLE "User" ADD COLUMN "signatureMimeType" TEXT;

ALTER TABLE "ApprovalAction" ADD COLUMN "signatureStorageKey" TEXT;
ALTER TABLE "ApprovalAction" ADD COLUMN "signatureMimeType" TEXT;
