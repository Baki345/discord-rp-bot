-- AlterTable
ALTER TABLE "GuildConfig" ADD COLUMN     "requireActiveSession" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RPSession" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "startedByDiscordId" TEXT NOT NULL,

    CONSTRAINT "RPSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RPSession_guildId_idx" ON "RPSession"("guildId");

-- CreateIndex
CREATE INDEX "RPSession_guildId_endedAt_idx" ON "RPSession"("guildId", "endedAt");

-- AddForeignKey
ALTER TABLE "RPSession" ADD CONSTRAINT "RPSession_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
