-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "annualTurnover" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "taxSystem" TEXT DEFAULT 'PAN';
