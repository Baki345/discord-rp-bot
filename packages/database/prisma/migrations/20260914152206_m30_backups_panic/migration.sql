-- AlterTable
ALTER TABLE "GuildConfig" ADD COLUMN     "panicConfig" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "panicState" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "SecurityBackup" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "label" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityBackup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityBackup_guildId_createdAt_idx" ON "SecurityBackup"("guildId", "createdAt");
