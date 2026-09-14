-- AlterTable
ALTER TABLE "GuildConfig" ADD COLUMN     "lockdownState" JSONB NOT NULL DEFAULT '{}';
