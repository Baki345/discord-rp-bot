-- AlterTable
ALTER TABLE "GuildConfig" ADD COLUMN     "quarantineRoleId" TEXT;

-- CreateTable
CREATE TABLE "QuarantineRecord" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "priorRoleIds" JSONB NOT NULL,
    "reason" TEXT,
    "quarantinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "QuarantineRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuarantineRecord_discordUserId_key" ON "QuarantineRecord"("discordUserId");

-- CreateIndex
CREATE INDEX "QuarantineRecord_guildId_idx" ON "QuarantineRecord"("guildId");
