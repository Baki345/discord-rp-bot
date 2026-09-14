-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "GuildConfig" ADD COLUMN     "appealsChannelId" TEXT,
ADD COLUMN     "warnEscalationConfig" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "Appeal" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Appeal_guildId_status_idx" ON "Appeal"("guildId", "status");

-- CreateIndex
CREATE INDEX "Appeal_caseId_idx" ON "Appeal"("caseId");

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ModerationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
