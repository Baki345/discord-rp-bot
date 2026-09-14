-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "discordChannelId" TEXT;

-- CreateTable
CREATE TABLE "ActivityDefinition" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 30,
    "rewardCashMinCents" INTEGER NOT NULL DEFAULT 0,
    "rewardCashMaxCents" INTEGER NOT NULL DEFAULT 0,
    "rewardItemId" TEXT,
    "rewardItemQty" INTEGER NOT NULL DEFAULT 1,
    "requiredPlaceId" TEXT,

    CONSTRAINT "ActivityDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityAttempt" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "rewardCashCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityDefinition_guildId_idx" ON "ActivityDefinition"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityDefinition_guildId_key_key" ON "ActivityDefinition"("guildId", "key");

-- CreateIndex
CREATE INDEX "ActivityAttempt_characterId_activityId_idx" ON "ActivityAttempt"("characterId", "activityId");

-- AddForeignKey
ALTER TABLE "ActivityDefinition" ADD CONSTRAINT "ActivityDefinition_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityAttempt" ADD CONSTRAINT "ActivityAttempt_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ActivityDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityAttempt" ADD CONSTRAINT "ActivityAttempt_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
