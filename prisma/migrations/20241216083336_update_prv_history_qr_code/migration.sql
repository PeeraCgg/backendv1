/*
  Warnings:

  - Added the required column `expiresAt` to the `Prv_QRCode` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Prv_History" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "Prv_QRCode" ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL;
