-- AlterTable
ALTER TABLE "GuildConfig" ADD COLUMN     "levelingConfig" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "MemberLevel" (
    "guildId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "lastTextXpAt" TIMESTAMP(3),
    "lastVoiceTickAt" TIMESTAMP(3),
    "cardBackgroundUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberLevel_pkey" PRIMARY KEY ("guildId","discordUserId")
);
