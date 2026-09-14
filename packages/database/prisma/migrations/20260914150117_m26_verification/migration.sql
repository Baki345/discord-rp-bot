-- AlterTable
ALTER TABLE "GuildConfig" ADD COLUMN     "verificationConfig" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "VerificationAttempt" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "VerificationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationAttempt_guildId_processedAt_idx" ON "VerificationAttempt"("guildId", "processedAt");
