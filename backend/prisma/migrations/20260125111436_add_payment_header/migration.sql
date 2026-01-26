/*
  Warnings:

  - A unique constraint covering the columns `[receiptCode]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - The required column `receiptCode` was added to the `Transaction` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "autoApprovalMinutes" INTEGER NOT NULL DEFAULT 60;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "autoSettleAt" TIMESTAMP(3),
ADD COLUMN     "merchantPubKey" TEXT,
ADD COLUMN     "paymentHeader" TEXT,
ADD COLUMN     "receiptCode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_receiptCode_key" ON "Transaction"("receiptCode");

-- CreateIndex
CREATE INDEX "Transaction_autoSettleAt_idx" ON "Transaction"("autoSettleAt");
