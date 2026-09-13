-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "CharacterStatus" AS ENUM ('ACTIVE', 'JAILED', 'HOSPITALIZED', 'DEAD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ItemRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('PERSONAL', 'COMPANY', 'SAVINGS');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'TRANSFER_CASH', 'TRANSFER_BANK', 'SALARY', 'FINE', 'SHOP_PURCHASE', 'SHOP_SALE', 'VEHICLE_PURCHASE', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('GARAGED', 'IMPOUNDED', 'DESTROYED', 'IN_USE');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('DISCORD_USER', 'DASHBOARD_USER', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "discriminator" TEXT,
    "globalName" TEXT,
    "avatarUrl" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" INTEGER,
    "scope" TEXT,
    "token_type" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,
    "ownerDiscordId" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "currencyName" TEXT NOT NULL DEFAULT 'Dollar',
    "currencySymbol" TEXT NOT NULL DEFAULT '$',
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planId" TEXT NOT NULL DEFAULT 'FREE',

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildConfig" (
    "guildId" TEXT NOT NULL,
    "hungerThirstEnabled" BOOLEAN NOT NULL DEFAULT false,
    "startingCashCents" INTEGER NOT NULL DEFAULT 50000,
    "maxCharactersOverride" INTEGER,
    "auditLogChannelId" TEXT,
    "economyLogChannelId" TEXT,
    "moderationLogChannelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildConfig_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "PremiumPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "maxCharactersPerGuild" INTEGER NOT NULL,
    "maxVehiclesPerGuild" INTEGER NOT NULL,
    "maxCompaniesPerGuild" INTEGER NOT NULL,
    "maxJobsPerGuild" INTEGER NOT NULL,
    "maxShopsPerGuild" INTEGER NOT NULL,
    "maxPlacesPerGuild" INTEGER NOT NULL,
    "featureFlags" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PremiumPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildSubscription" (
    "guildId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
    "provider" TEXT,
    "externalCustomerId" TEXT,
    "externalSubId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildSubscription_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "nationality" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "cashCents" INTEGER NOT NULL DEFAULT 0,
    "status" "CharacterStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActiveForUser" BOOLEAN NOT NULL DEFAULT true,
    "hunger" INTEGER,
    "thirst" INTEGER,
    "lastNeedsTickAt" TIMESTAMP(3),
    "criminalRecordPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "rarity" "ItemRarity" NOT NULL DEFAULT 'COMMON',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "isStackable" BOOLEAN NOT NULL DEFAULT true,
    "isUsable" BOOLEAN NOT NULL DEFAULT false,
    "isConsumable" BOOLEAN NOT NULL DEFAULT false,
    "isIllegal" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "characterId" TEXT,
    "companyId" TEXT,
    "type" "BankAccountType" NOT NULL DEFAULT 'PERSONAL',
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "interestRateBps" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "fromAccountId" TEXT,
    "toAccountId" TEXT,
    "fromCharacterId" TEXT,
    "toCharacterId" TEXT,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "isIllegal" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobGrade" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "salaryCents" INTEGER NOT NULL DEFAULT 0,
    "permissions" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "JobGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterJob" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "hiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "ownerCharacterId" TEXT NOT NULL,
    "treasuryAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyGrade" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "salaryCents" INTEGER NOT NULL DEFAULT 0,
    "permissions" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "CompanyGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyEmployee" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "hiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleCategory" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basePriceCents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VehicleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "maxSpeed" INTEGER,
    "seats" INTEGER NOT NULL DEFAULT 4,
    "imageUrl" TEXT,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "ownerCharacterId" TEXT,
    "ownerCompanyId" TEXT,
    "condition" INTEGER NOT NULL DEFAULT 100,
    "fuel" INTEGER NOT NULL DEFAULT 100,
    "mileage" INTEGER NOT NULL DEFAULT 0,
    "insuranceUntil" TIMESTAMP(3),
    "status" "VehicleStatus" NOT NULL DEFAULT 'GARAGED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "category" TEXT,
    "coordX" DOUBLE PRECISION,
    "coordY" DOUBLE PRECISION,
    "coordZ" DOUBLE PRECISION,
    "ownerCharacterId" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "placeId" TEXT,
    "companyId" TEXT,
    "openHour" INTEGER,
    "closeHour" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopProduct" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "stock" INTEGER,
    "canBuy" BOOLEAN NOT NULL DEFAULT true,
    "canSell" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RPRole" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "discordRoleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RPRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMemberRPRole" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMemberRPRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterRPRole" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterRPRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorDiscordId" TEXT,
    "actorCharacterId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "mirroredToDiscord" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Guild_planId_idx" ON "Guild"("planId");

-- CreateIndex
CREATE INDEX "Character_guildId_discordUserId_idx" ON "Character"("guildId", "discordUserId");

-- CreateIndex
CREATE INDEX "Character_guildId_idx" ON "Character"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Character_guildId_discordUserId_firstName_lastName_key" ON "Character"("guildId", "discordUserId", "firstName", "lastName");

-- CreateIndex
CREATE INDEX "Item_guildId_idx" ON "Item"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Item_guildId_key_key" ON "Item"("guildId", "key");

-- CreateIndex
CREATE INDEX "InventoryItem_guildId_idx" ON "InventoryItem"("guildId");

-- CreateIndex
CREATE INDEX "InventoryItem_characterId_idx" ON "InventoryItem"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_characterId_itemId_key" ON "InventoryItem"("characterId", "itemId");

-- CreateIndex
CREATE INDEX "BankAccount_guildId_idx" ON "BankAccount"("guildId");

-- CreateIndex
CREATE INDEX "BankAccount_characterId_idx" ON "BankAccount"("characterId");

-- CreateIndex
CREATE INDEX "BankAccount_companyId_idx" ON "BankAccount"("companyId");

-- CreateIndex
CREATE INDEX "Transaction_guildId_createdAt_idx" ON "Transaction"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_fromAccountId_idx" ON "Transaction"("fromAccountId");

-- CreateIndex
CREATE INDEX "Transaction_toAccountId_idx" ON "Transaction"("toAccountId");

-- CreateIndex
CREATE INDEX "Job_guildId_idx" ON "Job"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_guildId_key_key" ON "Job"("guildId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "JobGrade_jobId_rank_key" ON "JobGrade"("jobId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterJob_characterId_key" ON "CharacterJob"("characterId");

-- CreateIndex
CREATE INDEX "CharacterJob_guildId_idx" ON "CharacterJob"("guildId");

-- CreateIndex
CREATE INDEX "CharacterJob_jobId_idx" ON "CharacterJob"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_treasuryAccountId_key" ON "Company"("treasuryAccountId");

-- CreateIndex
CREATE INDEX "Company_guildId_idx" ON "Company"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_guildId_name_key" ON "Company"("guildId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyGrade_companyId_rank_key" ON "CompanyGrade"("companyId", "rank");

-- CreateIndex
CREATE INDEX "CompanyEmployee_guildId_idx" ON "CompanyEmployee"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyEmployee_companyId_characterId_key" ON "CompanyEmployee"("companyId", "characterId");

-- CreateIndex
CREATE INDEX "VehicleCategory_guildId_idx" ON "VehicleCategory"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleCategory_guildId_key_key" ON "VehicleCategory"("guildId", "key");

-- CreateIndex
CREATE INDEX "VehicleModel_guildId_idx" ON "VehicleModel"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_guildId_name_key" ON "VehicleModel"("guildId", "name");

-- CreateIndex
CREATE INDEX "Vehicle_guildId_idx" ON "Vehicle"("guildId");

-- CreateIndex
CREATE INDEX "Vehicle_ownerCharacterId_idx" ON "Vehicle"("ownerCharacterId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_guildId_plate_key" ON "Vehicle"("guildId", "plate");

-- CreateIndex
CREATE INDEX "Place_guildId_idx" ON "Place"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Place_guildId_name_key" ON "Place"("guildId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_companyId_key" ON "Shop"("companyId");

-- CreateIndex
CREATE INDEX "Shop_guildId_idx" ON "Shop"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_guildId_name_key" ON "Shop"("guildId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ShopProduct_shopId_itemId_key" ON "ShopProduct"("shopId", "itemId");

-- CreateIndex
CREATE INDEX "RPRole_guildId_idx" ON "RPRole"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "RPRole_guildId_key_key" ON "RPRole"("guildId", "key");

-- CreateIndex
CREATE INDEX "GuildMemberRPRole_guildId_discordUserId_idx" ON "GuildMemberRPRole"("guildId", "discordUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildMemberRPRole_guildId_discordUserId_roleId_key" ON "GuildMemberRPRole"("guildId", "discordUserId", "roleId");

-- CreateIndex
CREATE INDEX "CharacterRPRole_guildId_idx" ON "CharacterRPRole"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterRPRole_characterId_roleId_key" ON "CharacterRPRole"("characterId", "roleId");

-- CreateIndex
CREATE INDEX "AuditLog_guildId_createdAt_idx" ON "AuditLog"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_guildId_action_idx" ON "AuditLog"("guildId", "action");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PremiumPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildConfig" ADD CONSTRAINT "GuildConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildSubscription" ADD CONSTRAINT "GuildSubscription_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_fromCharacterId_fkey" FOREIGN KEY ("fromCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_toCharacterId_fkey" FOREIGN KEY ("toCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobGrade" ADD CONSTRAINT "JobGrade_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterJob" ADD CONSTRAINT "CharacterJob_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterJob" ADD CONSTRAINT "CharacterJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterJob" ADD CONSTRAINT "CharacterJob_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "JobGrade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_ownerCharacterId_fkey" FOREIGN KEY ("ownerCharacterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_treasuryAccountId_fkey" FOREIGN KEY ("treasuryAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyGrade" ADD CONSTRAINT "CompanyGrade_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyEmployee" ADD CONSTRAINT "CompanyEmployee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyEmployee" ADD CONSTRAINT "CompanyEmployee_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyEmployee" ADD CONSTRAINT "CompanyEmployee_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "CompanyGrade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCategory" ADD CONSTRAINT "VehicleCategory_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "VehicleCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_ownerCharacterId_fkey" FOREIGN KEY ("ownerCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_ownerCompanyId_fkey" FOREIGN KEY ("ownerCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_ownerCharacterId_fkey" FOREIGN KEY ("ownerCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RPRole" ADD CONSTRAINT "RPRole_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMemberRPRole" ADD CONSTRAINT "GuildMemberRPRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RPRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterRPRole" ADD CONSTRAINT "CharacterRPRole_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterRPRole" ADD CONSTRAINT "CharacterRPRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RPRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorCharacterId_fkey" FOREIGN KEY ("actorCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
