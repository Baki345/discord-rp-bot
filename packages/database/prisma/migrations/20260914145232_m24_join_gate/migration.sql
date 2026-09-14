-- AlterTable
ALTER TABLE "GuildConfig" ADD COLUMN     "joinGateConfig" JSONB NOT NULL DEFAULT '{}';
