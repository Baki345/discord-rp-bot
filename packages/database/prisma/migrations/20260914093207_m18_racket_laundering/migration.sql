-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'LAUNDER';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "isLaunderingFront" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastRacketedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RacketCollection" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RacketCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaunderingOperation" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaunderingOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RacketCollection_guildId_idx" ON "RacketCollection"("guildId");

-- CreateIndex
CREATE INDEX "RacketCollection_companyId_idx" ON "RacketCollection"("companyId");

-- CreateIndex
CREATE INDEX "LaunderingOperation_guildId_idx" ON "LaunderingOperation"("guildId");

-- CreateIndex
CREATE INDEX "LaunderingOperation_companyId_idx" ON "LaunderingOperation"("companyId");

-- AddForeignKey
ALTER TABLE "RacketCollection" ADD CONSTRAINT "RacketCollection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RacketCollection" ADD CONSTRAINT "RacketCollection_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaunderingOperation" ADD CONSTRAINT "LaunderingOperation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaunderingOperation" ADD CONSTRAINT "LaunderingOperation_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
