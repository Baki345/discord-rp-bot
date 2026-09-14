-- CreateEnum
CREATE TYPE "SecurityStaffTier" AS ENUM ('EXTRA_OWNER', 'TRUSTED_ADMIN');

-- CreateTable
CREATE TABLE "SecurityStaff" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "tier" "SecurityStaffTier" NOT NULL,
    "addedByDiscordId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RescueKey" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "generatedByDiscordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),
    "redeemedByDiscordId" TEXT,

    CONSTRAINT "RescueKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityStaff_guildId_idx" ON "SecurityStaff"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityStaff_guildId_discordUserId_key" ON "SecurityStaff"("guildId", "discordUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RescueKey_guildId_key" ON "RescueKey"("guildId");
