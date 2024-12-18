/*
  Warnings:

  - A unique constraint covering the columns `[optionType,optionValue]` on the table `Prv_ProductOption` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Prv_ProductOption_optionType_optionValue_key" ON "Prv_ProductOption"("optionType", "optionValue");
