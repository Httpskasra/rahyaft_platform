/*
  Warnings:

  - You are about to drop the column `companyName` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `Customer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nationalCode]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `birthDate` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mobile` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `occupation` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `occupationGroup` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `province` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Made the column `nationalCode` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `address` on table `Customer` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "OccupationGroup" AS ENUM ('GOVERNMENT_EMPLOYEE', 'PRIVATE_SECTOR_EMPLOYEE', 'SELF_EMPLOYED', 'FREELANCER', 'RETIRED', 'STUDENT', 'HOUSEHOLDER', 'UNEMPLOYED', 'OTHER');

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "companyName",
DROP COLUMN "description",
DROP COLUMN "fullName",
DROP COLUMN "phoneNumber",
ADD COLUMN     "birthDate" TEXT NOT NULL,
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "gender" "Gender" NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "mobile" TEXT NOT NULL,
ADD COLUMN     "occupation" TEXT NOT NULL,
ADD COLUMN     "occupationGroup" "OccupationGroup" NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "province" TEXT NOT NULL,
ADD COLUMN     "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "nationalCode" SET NOT NULL,
ALTER COLUMN "address" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_nationalCode_key" ON "Customer"("nationalCode");
