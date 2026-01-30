-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "aiAnalyzedAt" TIMESTAMP(3),
ADD COLUMN     "aiConfidence" INTEGER,
ADD COLUMN     "aiDecision" TEXT,
ADD COLUMN     "aiReasoning" TEXT,
ADD COLUMN     "merchantExplanation" TEXT;
