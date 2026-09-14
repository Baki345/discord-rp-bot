-- AlterTable
ALTER TABLE "GuildConfig" ADD COLUMN     "mainChannelId" TEXT,
ADD COLUMN     "partnershipChannelIds" JSONB NOT NULL DEFAULT '[]';
