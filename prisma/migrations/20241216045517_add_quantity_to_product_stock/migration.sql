/*
  Warnings:

  - Added the required column `quantity` to the `ProductStock` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductStock" ADD COLUMN     "quantity" INTEGER NOT NULL;
