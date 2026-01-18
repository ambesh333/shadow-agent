-- CreateEnum
CREATE TYPE "Network" AS ENUM ('MAINNET', 'DEVNET');

-- CreateEnum
CREATE TYPE "Token" AS ENUM ('NATIVE', 'USDC', 'USDT');

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "mintAddress" TEXT,
ADD COLUMN     "network" "Network" NOT NULL DEFAULT 'MAINNET',
ADD COLUMN     "token" "Token" NOT NULL DEFAULT 'NATIVE';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "network" "Network" NOT NULL DEFAULT 'MAINNET',
ADD COLUMN     "token" "Token" NOT NULL DEFAULT 'NATIVE';
