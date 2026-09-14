-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "jailedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CharacterJob" ADD COLUMN     "onDuty" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "isLawEnforcement" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RobberyTarget" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rewardMinCents" INTEGER NOT NULL,
    "rewardMaxCents" INTEGER NOT NULL,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 60,
    "minPoliceOnDuty" INTEGER NOT NULL DEFAULT 0,
    "successChancePct" INTEGER NOT NULL DEFAULT 50,
    "jailMinutes" INTEGER NOT NULL DEFAULT 15,
    "placeId" TEXT,

    CONSTRAINT "RobberyTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RobberyAttempt" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "rewardCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RobberyAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RobberyTarget_guildId_idx" ON "RobberyTarget"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "RobberyTarget_guildId_key_key" ON "RobberyTarget"("guildId", "key");

-- CreateIndex
CREATE INDEX "RobberyAttempt_characterId_targetId_idx" ON "RobberyAttempt"("characterId", "targetId");

-- AddForeignKey
ALTER TABLE "RobberyTarget" ADD CONSTRAINT "RobberyTarget_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RobberyAttempt" ADD CONSTRAINT "RobberyAttempt_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "RobberyTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RobberyAttempt" ADD CONSTRAINT "RobberyAttempt_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
