/*
  Warnings:

  - The values [MANAGER] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `notes` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `reference` on the `Transaction` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,2)`.
  - Made the column `zipCode` on table `Business` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `type` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'OWNER', 'ACCOUNTANT', 'STAFF');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
COMMIT;

-- DropIndex
DROP INDEX "Business_createdAt_idx";

-- DropIndex
DROP INDEX "Business_isVerified_idx";

-- DropIndex
DROP INDEX "Transaction_businessId_idx";

-- DropIndex
DROP INDEX "Transaction_date_idx";

-- DropIndex
DROP INDEX "Transaction_type_idx";

-- DropIndex
DROP INDEX "User_businessId_idx";

-- DropIndex
DROP INDEX "User_email_idx";

-- DropIndex
DROP INDEX "User_phone_idx";

-- AlterTable
ALTER TABLE "Business" ALTER COLUMN "type" DROP DEFAULT,
ALTER COLUMN "country" DROP DEFAULT,
ALTER COLUMN "zipCode" SET NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "notes",
DROP COLUMN "reference",
ADD COLUMN     "partyName" TEXT,
ADD COLUMN     "paymentMode" TEXT,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "date" DROP DEFAULT,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "status" DROP NOT NULL,
ALTER COLUMN "role" DROP DEFAULT;

-- DropEnum
DROP TYPE "TransactionType";
