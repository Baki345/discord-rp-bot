-- CreateTable
CREATE TABLE "CommandPermissionOverride" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "commandName" TEXT NOT NULL,
    "allowedRoleIds" JSONB NOT NULL DEFAULT '[]',
    "deniedRoleIds" JSONB NOT NULL DEFAULT '[]',
    "allowedChannelIds" JSONB NOT NULL DEFAULT '[]',
    "cooldownSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommandPermissionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommandPermissionOverride_guildId_commandName_key" ON "CommandPermissionOverride"("guildId", "commandName");
