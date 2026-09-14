-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'CLAIMED', 'CLOSED');

-- CreateTable
CREATE TABLE "TicketPanel" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketPanel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketCategory" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "panelId" TEXT,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "discordCategoryId" TEXT,
    "supportRoleIds" JSONB NOT NULL DEFAULT '[]',
    "claimRoleIds" JSONB NOT NULL DEFAULT '[]',
    "closeRoleIds" JSONB NOT NULL DEFAULT '[]',
    "vcRequestRoleIds" JSONB NOT NULL DEFAULT '[]',
    "formQuestions" JSONB NOT NULL DEFAULT '[]',
    "ticketLimitPerUser" INTEGER,
    "autoCloseAfterMinutesInactive" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "openerDiscordId" TEXT NOT NULL,
    "claimedByDiscordId" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "voiceChannelId" TEXT,
    "formAnswers" JSONB NOT NULL DEFAULT '{}',
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closedByDiscordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketTranscript" (
    "ticketId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketTranscript_pkey" PRIMARY KEY ("ticketId")
);

-- CreateIndex
CREATE INDEX "TicketPanel_guildId_idx" ON "TicketPanel"("guildId");

-- CreateIndex
CREATE INDEX "TicketCategory_guildId_idx" ON "TicketCategory"("guildId");

-- CreateIndex
CREATE INDEX "TicketCategory_panelId_idx" ON "TicketCategory"("panelId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_channelId_key" ON "Ticket"("channelId");

-- CreateIndex
CREATE INDEX "Ticket_guildId_status_idx" ON "Ticket"("guildId", "status");

-- CreateIndex
CREATE INDEX "Ticket_guildId_openerDiscordId_idx" ON "Ticket"("guildId", "openerDiscordId");

-- CreateIndex
CREATE INDEX "TicketTranscript_guildId_idx" ON "TicketTranscript"("guildId");

-- AddForeignKey
ALTER TABLE "TicketCategory" ADD CONSTRAINT "TicketCategory_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "TicketPanel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketTranscript" ADD CONSTRAINT "TicketTranscript_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
