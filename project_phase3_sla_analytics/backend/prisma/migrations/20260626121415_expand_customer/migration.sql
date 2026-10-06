/*
  Warnings:

  - The values [GOVERNMENT_EMPLOYEE,PRIVATE_SECTOR_EMPLOYEE,SELF_EMPLOYED,FREELANCER,RETIRED,STUDENT,HOUSEHOLDER,UNEMPLOYED] on the enum `OccupationGroup` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OccupationGroup_new" AS ENUM ('HAIR_TRANSPLANT_TECHNICIAN', 'NAIL_TECHNICIAN', 'GENERAL_PRACTITIONER', 'PHYSICIAN', 'HAIR_BEAUTY_CLINIC', 'HOME_DEVICE_CUSTOMER', 'BARBER', 'DENTIST', 'VETERINARIAN', 'COLLEAGUE', 'EMPLOYEE', 'DERMATOLOGIST', 'GYNECOLOGIST', 'OTHER');
ALTER TABLE "Customer" ALTER COLUMN "occupationGroup" TYPE "OccupationGroup_new" USING ("occupationGroup"::text::"OccupationGroup_new");
ALTER TYPE "OccupationGroup" RENAME TO "OccupationGroup_old";
ALTER TYPE "OccupationGroup_new" RENAME TO "OccupationGroup";
DROP TYPE "public"."OccupationGroup_old";
COMMIT;
