-- CreateTable
CREATE TABLE "CraftingRecipe" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resultItemId" TEXT NOT NULL,
    "resultQuantity" INTEGER NOT NULL DEFAULT 1,
    "requiredPlaceId" TEXT,

    CONSTRAINT "CraftingRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CraftingIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CraftingIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CraftingRecipe_guildId_idx" ON "CraftingRecipe"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "CraftingRecipe_guildId_key_key" ON "CraftingRecipe"("guildId", "key");

-- AddForeignKey
ALTER TABLE "CraftingRecipe" ADD CONSTRAINT "CraftingRecipe_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CraftingRecipe" ADD CONSTRAINT "CraftingRecipe_resultItemId_fkey" FOREIGN KEY ("resultItemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CraftingIngredient" ADD CONSTRAINT "CraftingIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "CraftingRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CraftingIngredient" ADD CONSTRAINT "CraftingIngredient_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
