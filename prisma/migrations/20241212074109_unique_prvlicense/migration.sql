/*
  Warnings:

  - A unique constraint covering the columns `[prvLicenseId]` on the table `Prv_Privilege` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Prv_Privilege" ADD COLUMN     "registeredDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Prv_Privilege_prvLicenseId_key" ON "Prv_Privilege"("prvLicenseId");
