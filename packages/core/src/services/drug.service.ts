import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { requirePermission } from "../permissions/check-permission.js";
import { isFeatureEnabled } from "../quota/quota-service.js";
import { getCharacter } from "./character.service.js";
import { addItemToInventory, removeItemFromInventory, listInventory } from "./inventory.service.js";
import { assertAtPlace, getPlace } from "./place.service.js";

export const CreateDrugTypeInput = z.object({
  guildId: z.string(),
  key: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9_-]+$/, "lettres minuscules, chiffres, - et _ uniquement"),
  name: z.string().min(2).max(56),
  linkedItemId: z.string(),
  productionPlaceId: z.string().optional(),
  sellPlaceId: z.string().optional(),
  cooldownMinutes: z.number().int().min(1).max(10_080).optional(),
  sellPriceMinCents: z.number().int().min(0),
  sellPriceMaxCents: z.number().int().min(0),
  arrestChancePct: z.number().int().min(0).max(100).optional(),
  arrestJailMinutes: z.number().int().min(0).max(1440).optional(),
});
export type CreateDrugTypeInput = z.infer<typeof CreateDrugTypeInput>;

export async function createDrugType(actor: ActorContext, input: CreateDrugTypeInput) {
  const data = CreateDrugTypeInput.parse(input);
  requirePermission(actor, "MANAGE_ECONOMY");

  if (data.sellPriceMinCents > data.sellPriceMaxCents) {
    throw new ServiceError("VALIDATION_ERROR", {}, "Le prix minimal ne peut pas dépasser le prix maximal.");
  }

  const existing = await prisma.drugType.findUnique({ where: { guildId_key: { guildId: data.guildId, key: data.key } } });
  if (existing) throw new ServiceError("ALREADY_EXISTS", { key: data.key });

  const item = await prisma.item.findFirst({ where: { id: data.linkedItemId, guildId: data.guildId } });
  if (!item) throw new ServiceError("NOT_FOUND", {}, "L'objet lié n'existe pas.");

  const drugType = await prisma.drugType.create({
    data: {
      guildId: data.guildId,
      key: data.key,
      name: data.name,
      linkedItemId: data.linkedItemId,
      productionPlaceId: data.productionPlaceId,
      sellPlaceId: data.sellPlaceId,
      cooldownMinutes: data.cooldownMinutes ?? 20,
      sellPriceMinCents: data.sellPriceMinCents,
      sellPriceMaxCents: data.sellPriceMaxCents,
      arrestChancePct: data.arrestChancePct ?? 10,
      arrestJailMinutes: data.arrestJailMinutes ?? 20,
    },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "drug.type_create",
    targetType: "DrugType",
    targetId: drugType.id,
    metadata: { name: drugType.name },
  });

  return drugType;
}

export async function listDrugTypes(guildId: string) {
  return prisma.drugType.findMany({ where: { guildId }, include: { linkedItem: true }, orderBy: { name: "asc" } });
}

export async function getDrugType(guildId: string, drugTypeId: string) {
  const drugType = await prisma.drugType.findFirst({ where: { id: drugTypeId, guildId }, include: { linkedItem: true } });
  if (!drugType) throw new ServiceError("NOT_FOUND", { drugTypeId });
  return drugType;
}

async function assertDrugsEnabled(guildId: string) {
  const enabled = await isFeatureEnabled(guildId, "drugs");
  if (!enabled) {
    throw new ServiceError("VALIDATION_ERROR", {}, "Le système de drogues n'est pas activé sur ce serveur (nécessite un plan supérieur).");
  }
}

function assertNotJailed(character: { jailedUntil: Date | null }) {
  if (character.jailedUntil && character.jailedUntil.getTime() > Date.now()) {
    throw new ServiceError("VALIDATION_ERROR", {}, `Tu es en prison jusqu'à <t:${Math.floor(character.jailedUntil.getTime() / 1000)}:R>.`);
  }
}

export const ProduceDrugInput = z.object({
  guildId: z.string(),
  characterId: z.string(),
  drugTypeId: z.string(),
  discordChannelId: z.string().optional(),
});
export type ProduceDrugInput = z.infer<typeof ProduceDrugInput>;

/** Instant grant + cooldown (no long-running timers, same shape as activities/robbery). */
export async function produceDrug(actor: ActorContext, input: ProduceDrugInput) {
  const data = ProduceDrugInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  if (actor.discordUserId !== character.discordUserId) throw new ServiceError("FORBIDDEN");
  assertNotJailed(character);
  await assertDrugsEnabled(data.guildId);

  const drugType = await getDrugType(data.guildId, data.drugTypeId);
  if (drugType.productionPlaceId) {
    const place = await getPlace(data.guildId, drugType.productionPlaceId);
    assertAtPlace(place, data.discordChannelId);
  }

  const lastAttempt = await prisma.drugProductionAttempt.findFirst({
    where: { drugTypeId: drugType.id, characterId: character.id },
    orderBy: { createdAt: "desc" },
  });
  if (lastAttempt) {
    const cooldownEndsAt = new Date(lastAttempt.createdAt.getTime() + drugType.cooldownMinutes * 60_000);
    if (cooldownEndsAt.getTime() > Date.now()) {
      const remainingMin = Math.ceil((cooldownEndsAt.getTime() - Date.now()) / 60_000);
      throw new ServiceError("VALIDATION_ERROR", { remainingMin }, `Encore en recharge — réessaie dans ${remainingMin} min.`);
    }
  }

  await prisma.drugProductionAttempt.create({
    data: { guildId: data.guildId, drugTypeId: drugType.id, characterId: character.id },
  });
  await addItemToInventory(data.guildId, character.id, drugType.linkedItemId, 1);

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: "drug.produce",
    targetType: "DrugType",
    targetId: drugType.id,
  });

  return { itemId: drugType.linkedItemId, itemName: drugType.linkedItem.name, quantity: 1 };
}

export const SellDrugInput = z.object({
  guildId: z.string(),
  characterId: z.string(),
  drugTypeId: z.string(),
  quantity: z.number().int().min(1).max(999),
  discordChannelId: z.string().optional(),
});
export type SellDrugInput = z.infer<typeof SellDrugInput>;

/** Sells first (guaranteed proceeds), then rolls the arrest chance — matches "you got paid, then the police showed up" rather than losing the sale on arrest. */
export async function sellDrug(actor: ActorContext, input: SellDrugInput) {
  const data = SellDrugInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  if (actor.discordUserId !== character.discordUserId) throw new ServiceError("FORBIDDEN");
  assertNotJailed(character);
  await assertDrugsEnabled(data.guildId);

  const drugType = await getDrugType(data.guildId, data.drugTypeId);
  if (drugType.sellPlaceId) {
    const place = await getPlace(data.guildId, drugType.sellPlaceId);
    assertAtPlace(place, data.discordChannelId);
  }

  const inventory = await listInventory(data.guildId, character.id);
  const held = inventory.find((i) => i.itemId === drugType.linkedItemId)?.quantity ?? 0;
  if (held < data.quantity) {
    throw new ServiceError("VALIDATION_ERROR", {}, `Tu n'as pas assez de "${drugType.linkedItem.name}" à vendre.`);
  }

  await removeItemFromInventory(character.id, drugType.linkedItemId, data.quantity);

  let totalCents = 0;
  for (let i = 0; i < data.quantity; i++) {
    totalCents += Math.round(drugType.sellPriceMinCents + Math.random() * (drugType.sellPriceMaxCents - drugType.sellPriceMinCents));
  }
  await prisma.character.update({ where: { id: character.id }, data: { cashCents: { increment: totalCents } } });

  const arrested = Math.random() * 100 < drugType.arrestChancePct;
  let jailedUntil: Date | null = null;
  if (arrested) {
    jailedUntil = new Date(Date.now() + drugType.arrestJailMinutes * 60_000);
    await prisma.character.update({ where: { id: character.id }, data: { jailedUntil } });
  }

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: arrested ? "drug.sell_arrested" : "drug.sell",
    targetType: "DrugType",
    targetId: drugType.id,
    metadata: { quantity: data.quantity, totalCents, jailedUntil },
  });

  return { totalCents, arrested, jailedUntil };
}
