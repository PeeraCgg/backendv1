/*
  Warnings:

  - You are about to drop the `Prv_Product` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Prv_ProductCombination` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Prv_ProductOption` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[qrCodeId]` on the table `Prv_History` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productStockId` to the `Prv_History` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Prv_History" DROP CONSTRAINT "Prv_History_productId_fkey";

-- DropForeignKey
ALTER TABLE "Prv_ProductCombination" DROP CONSTRAINT "Prv_ProductCombination_colorId_fkey";

-- DropForeignKey
ALTER TABLE "Prv_ProductCombination" DROP CONSTRAINT "Prv_ProductCombination_productId_fkey";

-- DropForeignKey
ALTER TABLE "Prv_ProductCombination" DROP CONSTRAINT "Prv_ProductCombination_sizeId_fkey";

-- AlterTable
ALTER TABLE "Prv_History" ADD COLUMN     "productStockId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Prv_Users" ADD COLUMN     "userQrCode" TEXT;

-- DropTable
DROP TABLE "Prv_Product";

-- DropTable
DROP TABLE "Prv_ProductCombination";

-- DropTable
DROP TABLE "Prv_ProductOption";

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "point" INTEGER NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductType" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductStock" (
    "id" SERIAL NOT NULL,
    "itemCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "colorId" INTEGER NOT NULL,
    "sizeId" INTEGER NOT NULL,
    "barcode" TEXT NOT NULL,
    "stockQrCode" TEXT,
    "productId" INTEGER NOT NULL,

    CONSTRAINT "ProductStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prv_History_qrCodeId_key" ON "Prv_History"("qrCodeId");

-- AddForeignKey
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prv_History" ADD CONSTRAINT "Prv_History_productStockId_fkey" FOREIGN KEY ("productStockId") REFERENCES "ProductStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
