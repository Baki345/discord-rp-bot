-- CreateEnum
CREATE TYPE "LogCategory" AS ENUM ('GENERAL', 'MODERATION', 'APPEALS', 'AUTOMOD', 'ANTI_NUKE', 'VERIFICATION', 'JOIN_GATE', 'JOIN_RAID', 'PANIC');

-- CreateTable
CREATE TABLE "LogRoute" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "category" "LogCategory" NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "LogRoute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogRoute_guildId_idx" ON "LogRoute"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "LogRoute_guildId_category_key" ON "LogRoute"("guildId", "category");

-- Backfill: GuildConfig.auditLogChannelId / moderationLogChannelId become
-- the GENERAL / MODERATION LogRoute rows, so already-configured channels
-- keep working with zero manual reconfiguration. The two GuildConfig
-- columns are left in place (unused from here on) rather than dropped.
INSERT INTO "LogRoute" ("id", "guildId", "category", "channelId")
SELECT gen_random_uuid()::text, "guildId", 'GENERAL', "auditLogChannelId"
FROM "GuildConfig"
WHERE "auditLogChannelId" IS NOT NULL;

INSERT INTO "LogRoute" ("id", "guildId", "category", "channelId")
SELECT gen_random_uuid()::text, "guildId", 'MODERATION', "moderationLogChannelId"
FROM "GuildConfig"
WHERE "moderationLogChannelId" IS NOT NULL;
