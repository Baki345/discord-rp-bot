-- CreateTable
CREATE TABLE "InteractionStat" (
    "guildId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "countGiven" INTEGER NOT NULL DEFAULT 0,
    "countReceived" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InteractionStat_pkey" PRIMARY KEY ("guildId","discordUserId","action")
);
