-- CreateTable
CREATE TABLE "Prv_Users" (
    "id" SERIAL NOT NULL,
    "firstname" TEXT,
    "lastname" TEXT,
    "mobile" TEXT,
    "birthday" TIMESTAMP(3),
    "email" TEXT,
    "isVerified" BOOLEAN DEFAULT false,
    "lineUserId" TEXT,
    "nationality" TEXT,

    CONSTRAINT "Prv_Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prv_Pdpa" (
    "id" SERIAL NOT NULL,
    "checkbox1" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Prv_Pdpa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prv_Otp" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "Prv_Otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prv_Status" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" INTEGER NOT NULL,

    CONSTRAINT "Prv_Status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prv_Privilege" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "prvExpiredDate" TIMESTAMP(3),
    "prvType" TEXT NOT NULL,
    "currentAmount" DOUBLE PRECISION NOT NULL,
    "totalAmountPerYear" DOUBLE PRECISION NOT NULL,
    "currentPoint" INTEGER NOT NULL,
    "prvLicenseId" INTEGER,

    CONSTRAINT "Prv_Privilege_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prv_Total_Expense" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "expenseAmount" DOUBLE PRECISION NOT NULL,
    "prvType" TEXT NOT NULL,
    "expensePoint" INTEGER NOT NULL,

    CONSTRAINT "Prv_Total_Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prv_Admin" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL,

    CONSTRAINT "Prv_Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prv_Product" (
    "id" SERIAL NOT NULL,
    "productName" TEXT NOT NULL,
    "point" INTEGER NOT NULL,
    "imagePath" TEXT,

    CONSTRAINT "Prv_Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prv_ProductOption" (
    "id" SERIAL NOT NULL,
    "optionType" TEXT NOT NULL,
    "optionValue" TEXT NOT NULL,

    CONSTRAINT "Prv_ProductOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prv_ProductCombination" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "colorId" INTEGER NOT NULL,
    "sizeId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "Prv_ProductCombination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prv_QRCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prv_QRCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prv_History" (
    "id" SERIAL NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "options" JSONB NOT NULL,
    "qrCodeId" INTEGER,

    CONSTRAINT "Prv_History_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prv_Users_mobile_key" ON "Prv_Users"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "Prv_Users_email_key" ON "Prv_Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Prv_Users_lineUserId_key" ON "Prv_Users"("lineUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Prv_Pdpa_userId_key" ON "Prv_Pdpa"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Prv_Otp_userId_key" ON "Prv_Otp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Prv_Status_userId_key" ON "Prv_Status"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Prv_Admin_username_key" ON "Prv_Admin"("username");

-- AddForeignKey
ALTER TABLE "Prv_Pdpa" ADD CONSTRAINT "Prv_Pdpa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Prv_Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prv_Otp" ADD CONSTRAINT "Prv_Otp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Prv_Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prv_Status" ADD CONSTRAINT "Prv_Status_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Prv_Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prv_Privilege" ADD CONSTRAINT "Prv_Privilege_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Prv_Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prv_Total_Expense" ADD CONSTRAINT "Prv_Total_Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Prv_Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prv_ProductCombination" ADD CONSTRAINT "Prv_ProductCombination_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Prv_Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prv_ProductCombination" ADD CONSTRAINT "Prv_ProductCombination_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Prv_ProductOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prv_ProductCombination" ADD CONSTRAINT "Prv_ProductCombination_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Prv_ProductOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prv_History" ADD CONSTRAINT "Prv_History_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Prv_Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prv_History" ADD CONSTRAINT "Prv_History_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "Prv_QRCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prv_History" ADD CONSTRAINT "Prv_History_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Prv_Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
