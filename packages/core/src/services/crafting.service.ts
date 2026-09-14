import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { requirePermission } from "../permissions/check-permission.js";
import { getCharacter } from "./character.service.js";
import { addItemToInventory, removeItemFromInventory, listInventory } from "./inventory.service.js";
import { assertAtPlace, getPlace } from "./place.service.js";

export const CraftingIngredientInput = z.object({ itemId: z.string(), quantity: z.number().int().min(1) });

export const CreateRecipeInput = z.object({
  guildId: z.string(),
  key: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9_-]+$/, "lettres minuscules, chiffres, - et _ uniquement"),
  name: z.string().min(2).max(56),
  resultItemId: z.string(),
  resultQuantity: z.number().int().min(1).optional(),
  requiredPlaceId: z.string().optional(),
  ingredients: z.array(CraftingIngredientInput).min(1),
});
export type CreateRecipeInput = z.infer<typeof CreateRecipeInput>;

/** Recipes are catalog data, managed like Item Builder entries (same MANAGE_ITEMS flag — a recipe is just another kind of item definition). */
export async function createRecipe(actor: ActorContext, input: CreateRecipeInput) {
  const data = CreateRecipeInput.parse(input);
  requirePermission(actor, "MANAGE_ITEMS");

  const existing = await prisma.craftingRecipe.findUnique({ where: { guildId_key: { guildId: data.guildId, key: data.key } } });
  if (existing) throw new ServiceError("ALREADY_EXISTS", { key: data.key });

  const resultItem = await prisma.item.findFirst({ where: { id: data.resultItemId, guildId: data.guildId } });
  if (!resultItem) throw new ServiceError("NOT_FOUND", {}, "L'objet produit n'existe pas.");

  const recipe = await prisma.craftingRecipe.create({
    data: {
      guildId: data.guildId,
      key: data.key,
      name: data.name,
      resultItemId: data.resultItemId,
      resultQuantity: data.resultQuantity ?? 1,
      requiredPlaceId: data.requiredPlaceId,
      ingredients: { create: data.ingredients.map((i) => ({ itemId: i.itemId, quantity: i.quantity })) },
    },
    include: { ingredients: true },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "crafting.recipe_create",
    targetType: "CraftingRecipe",
    targetId: recipe.id,
    metadata: { name: recipe.name },
  });

  return recipe;
}

export async function listRecipes(guildId: string) {
  return prisma.craftingRecipe.findMany({
    where: { guildId },
    include: { ingredients: { include: { item: true } }, resultItem: true },
    orderBy: { name: "asc" },
  });
}

export async function getRecipe(guildId: string, recipeId: string) {
  const recipe = await prisma.craftingRecipe.findFirst({
    where: { id: recipeId, guildId },
    include: { ingredients: { include: { item: true } }, resultItem: true },
  });
  if (!recipe) throw new ServiceError("NOT_FOUND", { recipeId });
  return recipe;
}

export const CraftItemInput = z.object({
  guildId: z.string(),
  characterId: z.string(),
  recipeId: z.string(),
  discordChannelId: z.string().optional(),
});
export type CraftItemInput = z.infer<typeof CraftItemInput>;

/** Validates every ingredient is held in sufficient quantity BEFORE removing any — a partial craft never leaves inventory half-consumed. */
export async function craftItem(actor: ActorContext, input: CraftItemInput) {
  const data = CraftItemInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  if (actor.discordUserId !== character.discordUserId) throw new ServiceError("FORBIDDEN");

  const recipe = await getRecipe(data.guildId, data.recipeId);
  if (recipe.requiredPlaceId) {
    const place = await getPlace(data.guildId, recipe.requiredPlaceId);
    assertAtPlace(place, data.discordChannelId);
  }

  const inventory = await listInventory(data.guildId, character.id);
  const inventoryMap = new Map(inventory.map((i) => [i.itemId, i.quantity]));
  for (const ingredient of recipe.ingredients) {
    const have = inventoryMap.get(ingredient.itemId) ?? 0;
    if (have < ingredient.quantity) {
      throw new ServiceError("VALIDATION_ERROR", {}, `Il te manque des ingrédients pour fabriquer "${recipe.name}".`);
    }
  }

  for (const ingredient of recipe.ingredients) {
    await removeItemFromInventory(character.id, ingredient.itemId, ingredient.quantity);
  }
  await addItemToInventory(data.guildId, character.id, recipe.resultItemId, recipe.resultQuantity);

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: "crafting.craft",
    targetType: "CraftingRecipe",
    targetId: recipe.id,
    metadata: { resultItemId: recipe.resultItemId, resultQuantity: recipe.resultQuantity },
  });

  return { resultItemId: recipe.resultItemId, resultItemName: recipe.resultItem.name, resultQuantity: recipe.resultQuantity };
}
