/*
  Warnings:

  - You are about to drop the column `title` on the `Transaction` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'ACCOUNTANT', 'STAFF');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- AlterTable
ALTER TABLE "Business" ALTER COLUMN "type" SET DEFAULT 'SOLE_PROPRIETOR',
ALTER COLUMN "country" SET DEFAULT 'Nepal',
ALTER COLUMN "zipCode" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "title",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "TransactionType" NOT NULL,
ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Active',
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'STAFF';

-- DropEnum
DROP TYPE "Role";

-- CreateIndex
CREATE INDEX "Business_isVerified_idx" ON "Business"("isVerified");

-- CreateIndex
CREATE INDEX "Business_createdAt_idx" ON "Business"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_businessId_idx" ON "Transaction"("businessId");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_businessId_idx" ON "User"("businessId");
