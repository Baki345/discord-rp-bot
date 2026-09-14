-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "ApplicationCategory" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "questions" JSONB NOT NULL DEFAULT '[]',
    "reviewerRoleIds" JSONB NOT NULL DEFAULT '[]',
    "resultChannelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "applicantDiscordId" TEXT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByDiscordId" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationCategory_guildId_idx" ON "ApplicationCategory"("guildId");

-- CreateIndex
CREATE INDEX "Application_guildId_categoryId_idx" ON "Application"("guildId", "categoryId");

-- CreateIndex
CREATE INDEX "Application_guildId_applicantDiscordId_idx" ON "Application"("guildId", "applicantDiscordId");
