-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "resourceId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_resourceId_idx" ON "Transaction"("resourceId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
