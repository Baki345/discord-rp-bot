-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passScorePct" INTEGER NOT NULL DEFAULT 80,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseQuestion" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "choices" JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterLicense" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterLicense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "License_guildId_idx" ON "License"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "License_guildId_key_key" ON "License"("guildId", "key");

-- CreateIndex
CREATE INDEX "CharacterLicense_guildId_idx" ON "CharacterLicense"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterLicense_characterId_licenseId_key" ON "CharacterLicense"("characterId", "licenseId");

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseQuestion" ADD CONSTRAINT "LicenseQuestion_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterLicense" ADD CONSTRAINT "CharacterLicense_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
