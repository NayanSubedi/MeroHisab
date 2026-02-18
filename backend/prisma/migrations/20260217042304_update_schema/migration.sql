/*
  Warnings:

  - You are about to drop the column `description` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMode` on the `Transaction` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - Made the column `category` on table `Transaction` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "description",
DROP COLUMN "paymentMode",
ADD COLUMN     "billNumber" TEXT,
ADD COLUMN     "complianceMessage" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "invoiceDetails" JSONB,
ADD COLUMN     "isComplianceIssue" BOOLEAN DEFAULT false,
ADD COLUMN     "partyPan" TEXT,
ADD COLUMN     "vatAmount" DOUBLE PRECISION,
ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "category" SET NOT NULL;
