/*
  Warnings:

  - A unique constraint covering the columns `[type]` on the table `ProductType` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ProductType_type_key" ON "ProductType"("type");
