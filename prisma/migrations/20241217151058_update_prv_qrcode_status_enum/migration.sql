/*
  Warnings:

  - The `status` column on the `Prv_QRCode` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "QRCodeStatus" AS ENUM ('active', 'used', 'expired');

-- AlterTable
ALTER TABLE "Prv_QRCode" DROP COLUMN "status",
ADD COLUMN     "status" "QRCodeStatus" NOT NULL DEFAULT 'active';
