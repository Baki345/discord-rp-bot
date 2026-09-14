import { prisma } from "@discord-rp/database";
import { ServiceError } from "../errors/service-error.js";

export async function listInventory(guildId: string, characterId: string) {
  return prisma.inventoryItem.findMany({
    where: { guildId, characterId },
    include: { item: true },
    orderBy: { item: { name: "asc" } },
  });
}

/** Internal helper (not permission-checked itself — callers like shop.service.ts own that): adds `quantity` of an item, stacking onto an existing row. */
export async function addItemToInventory(guildId: string, characterId: string, itemId: string, quantity: number) {
  const existing = await prisma.inventoryItem.findUnique({ where: { characterId_itemId: { characterId, itemId } } });
  if (existing) {
    return prisma.inventoryItem.update({ where: { id: existing.id }, data: { quantity: { increment: quantity } } });
  }
  return prisma.inventoryItem.create({ data: { guildId, characterId, itemId, quantity } });
}

/** Internal helper: removes `quantity`, deleting the row once it hits zero. Throws if the character doesn't hold enough. */
export async function removeItemFromInventory(characterId: string, itemId: string, quantity: number) {
  const existing = await prisma.inventoryItem.findUnique({ where: { characterId_itemId: { characterId, itemId } } });
  if (!existing || existing.quantity < quantity) {
    throw new ServiceError("VALIDATION_ERROR", {}, "Tu n'as pas assez de cet objet dans ton inventaire.");
  }
  if (existing.quantity === quantity) {
    await prisma.inventoryItem.delete({ where: { id: existing.id } });
    return;
  }
  await prisma.inventoryItem.update({ where: { id: existing.id }, data: { quantity: { decrement: quantity } } });
}
