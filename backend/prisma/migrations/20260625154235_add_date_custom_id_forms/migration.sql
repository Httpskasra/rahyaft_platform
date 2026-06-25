/*
  Warnings:

  - A unique constraint covering the columns `[customId]` on the table `Form` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "customId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Form_customId_key" ON "Form"("customId");
