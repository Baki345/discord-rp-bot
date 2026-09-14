import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { getCharacter } from "./character.service.js";

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

export const TransferItemInput = z.object({
  guildId: z.string(),
  fromCharacterId: z.string(),
  toCharacterId: z.string(),
  itemId: z.string(),
  quantity: z.number().int().min(1).max(999),
});
export type TransferItemInput = z.infer<typeof TransferItemInput>;

/** The sending character's own player initiates every transfer — same as handing an item to someone in person, no consent step. */
export async function transferItem(actor: ActorContext, input: TransferItemInput) {
  const data = TransferItemInput.parse(input);
  if (data.fromCharacterId === data.toCharacterId) {
    throw new ServiceError("VALIDATION_ERROR", {}, "Tu ne peux pas te donner un objet à toi-même.");
  }
  const [fromCharacter, toCharacter] = await Promise.all([
    getCharacter(data.guildId, data.fromCharacterId),
    getCharacter(data.guildId, data.toCharacterId),
  ]);
  if (actor.discordUserId !== fromCharacter.discordUserId) {
    throw new ServiceError("FORBIDDEN");
  }

  await removeItemFromInventory(fromCharacter.id, data.itemId, data.quantity);
  await addItemToInventory(data.guildId, toCharacter.id, data.itemId, data.quantity);

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: fromCharacter.id,
    action: "inventory.transfer",
    targetType: "Character",
    targetId: toCharacter.id,
    metadata: { itemId: data.itemId, quantity: data.quantity },
  });
}

export const DiscardItemInput = z.object({
  guildId: z.string(),
  characterId: z.string(),
  itemId: z.string(),
  quantity: z.number().int().min(1).max(999),
});
export type DiscardItemInput = z.infer<typeof DiscardItemInput>;

export async function discardItem(actor: ActorContext, input: DiscardItemInput) {
  const data = DiscardItemInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  if (actor.discordUserId !== character.discordUserId) {
    throw new ServiceError("FORBIDDEN");
  }

  await removeItemFromInventory(character.id, data.itemId, data.quantity);

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: "inventory.discard",
    targetType: "Item",
    targetId: data.itemId,
    metadata: { quantity: data.quantity },
  });
}
