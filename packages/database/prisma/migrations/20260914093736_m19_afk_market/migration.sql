-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "isPubliclyListed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sharePriceCents" INTEGER,
ADD COLUMN     "totalShares" INTEGER;

-- AlterTable
ALTER TABLE "GuildConfig" ADD COLUMN     "afkChannelId" TEXT,
ADD COLUMN     "afkTimeoutMinutes" INTEGER NOT NULL DEFAULT 20;

-- CreateTable
CREATE TABLE "CompanyShare" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompanyShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharePriceHistory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharePriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyShare_companyId_characterId_key" ON "CompanyShare"("companyId", "characterId");

-- CreateIndex
CREATE INDEX "SharePriceHistory_companyId_recordedAt_idx" ON "SharePriceHistory"("companyId", "recordedAt");

-- AddForeignKey
ALTER TABLE "CompanyShare" ADD CONSTRAINT "CompanyShare_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyShare" ADD CONSTRAINT "CompanyShare_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharePriceHistory" ADD CONSTRAINT "SharePriceHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
