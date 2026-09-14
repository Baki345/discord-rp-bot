-- CreateTable
CREATE TABLE "DrugType" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "linkedItemId" TEXT NOT NULL,
    "productionPlaceId" TEXT,
    "sellPlaceId" TEXT,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 20,
    "sellPriceMinCents" INTEGER NOT NULL,
    "sellPriceMaxCents" INTEGER NOT NULL,
    "arrestChancePct" INTEGER NOT NULL DEFAULT 10,
    "arrestJailMinutes" INTEGER NOT NULL DEFAULT 20,

    CONSTRAINT "DrugType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrugProductionAttempt" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "drugTypeId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrugProductionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DrugType_guildId_idx" ON "DrugType"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "DrugType_guildId_key_key" ON "DrugType"("guildId", "key");

-- CreateIndex
CREATE INDEX "DrugProductionAttempt_characterId_drugTypeId_idx" ON "DrugProductionAttempt"("characterId", "drugTypeId");

-- AddForeignKey
ALTER TABLE "DrugType" ADD CONSTRAINT "DrugType_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrugType" ADD CONSTRAINT "DrugType_linkedItemId_fkey" FOREIGN KEY ("linkedItemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrugProductionAttempt" ADD CONSTRAINT "DrugProductionAttempt_drugTypeId_fkey" FOREIGN KEY ("drugTypeId") REFERENCES "DrugType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
