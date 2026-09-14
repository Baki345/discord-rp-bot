-- CreateTable
CREATE TABLE "VehicleKey" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceKey" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaceKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleKey_guildId_idx" ON "VehicleKey"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleKey_vehicleId_characterId_key" ON "VehicleKey"("vehicleId", "characterId");

-- CreateIndex
CREATE INDEX "PlaceKey_guildId_idx" ON "PlaceKey"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceKey_placeId_characterId_key" ON "PlaceKey"("placeId", "characterId");

-- AddForeignKey
ALTER TABLE "VehicleKey" ADD CONSTRAINT "VehicleKey_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleKey" ADD CONSTRAINT "VehicleKey_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceKey" ADD CONSTRAINT "PlaceKey_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceKey" ADD CONSTRAINT "PlaceKey_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
