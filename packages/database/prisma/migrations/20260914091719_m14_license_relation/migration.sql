-- AddForeignKey
ALTER TABLE "CharacterLicense" ADD CONSTRAINT "CharacterLicense_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;
