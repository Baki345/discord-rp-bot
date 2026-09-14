import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { requirePermission } from "../permissions/check-permission.js";

const ItemRarityEnum = z.enum(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]);

export const CreateItemInput = z.object({
  guildId: z.string(),
  key: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9_-]+$/, "lettres minuscules, chiffres, - et _ uniquement"),
  name: z.string().min(2).max(56),
  description: z.string().max(300).optional(),
  category: z.string().min(2).max(32),
  rarity: ItemRarityEnum.optional(),
  weight: z.number().min(0).optional(),
  priceCents: z.number().int().min(0).optional(),
  isStackable: z.boolean().optional(),
  isUsable: z.boolean().optional(),
  isConsumable: z.boolean().optional(),
  isIllegal: z.boolean().optional(),
});
export type CreateItemInput = z.infer<typeof CreateItemInput>;

/** Item definitions ("Item Builder") are guild-admin-only — no per-guild quota, they're catalog data, not player-owned rows. */
export async function createItem(actor: ActorContext, input: CreateItemInput) {
  const data = CreateItemInput.parse(input);
  requirePermission(actor, "MANAGE_ITEMS");

  const existing = await prisma.item.findUnique({ where: { guildId_key: { guildId: data.guildId, key: data.key } } });
  if (existing) throw new ServiceError("ALREADY_EXISTS", { key: data.key });

  const item = await prisma.item.create({
    data: {
      guildId: data.guildId,
      key: data.key,
      name: data.name,
      description: data.description,
      category: data.category,
      rarity: data.rarity ?? "COMMON",
      weight: data.weight ?? 0,
      priceCents: data.priceCents ?? 0,
      isStackable: data.isStackable ?? true,
      isUsable: data.isUsable ?? false,
      isConsumable: data.isConsumable ?? false,
      isIllegal: data.isIllegal ?? false,
    },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "item.create",
    targetType: "Item",
    targetId: item.id,
    metadata: { name: item.name },
  });

  return item;
}

export async function listItems(guildId: string) {
  return prisma.item.findMany({ where: { guildId }, orderBy: { name: "asc" } });
}

export async function getItem(guildId: string, itemId: string) {
  const item = await prisma.item.findFirst({ where: { id: itemId, guildId } });
  if (!item) throw new ServiceError("NOT_FOUND", { itemId });
  return item;
}
