import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { getCharacter } from "./character.service.js";
import { removeItemFromInventory } from "./inventory.service.js";

const NEEDS_MAX = 100;
const NEEDS_MIN = 0;
/** Points lost per call to tickNeedsForGuild — apps/bot calls this on a fixed interval, not per real elapsed time. */
const DECAY_PER_TICK = 5;

interface ConsumableEffect {
  restoresHunger?: number;
  restoresThirst?: number;
}

/**
 * Decays hunger/thirst for every active character in a guild that has
 * `GuildConfig.hungerThirstEnabled` — a no-op otherwise. Only touches
 * characters whose needs were actually initialized (non-null), since a
 * character created before the toggle was turned on has no baseline yet.
 */
export async function tickNeedsForGuild(guildId: string): Promise<{ updated: number }> {
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  if (!config?.hungerThirstEnabled) return { updated: 0 };

  const result = await prisma.character.updateMany({
    where: { guildId, deletedAt: null, status: "ACTIVE", hunger: { not: null } },
    data: { hunger: { decrement: DECAY_PER_TICK }, thirst: { decrement: DECAY_PER_TICK }, lastNeedsTickAt: new Date() },
  });
  // Prisma's decrement can't express a floor — clamp negatives back to 0 in a second pass.
  await prisma.character.updateMany({ where: { guildId, hunger: { lt: NEEDS_MIN } }, data: { hunger: NEEDS_MIN } });
  await prisma.character.updateMany({ where: { guildId, thirst: { lt: NEEDS_MIN } }, data: { thirst: NEEDS_MIN } });

  return { updated: result.count };
}

export const ConsumeItemInput = z.object({
  guildId: z.string(),
  characterId: z.string(),
  itemId: z.string(),
});
export type ConsumeItemInput = z.infer<typeof ConsumeItemInput>;

/** Consumes one unit of a consumable item, applying its `metadata.restoresHunger`/`restoresThirst` (if set) up to the 0-100 range. */
export async function consumeInventoryItem(actor: ActorContext, input: ConsumeItemInput) {
  const data = ConsumeItemInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  if (actor.discordUserId !== character.discordUserId) {
    throw new ServiceError("FORBIDDEN");
  }

  const item = await prisma.item.findFirst({ where: { id: data.itemId, guildId: data.guildId } });
  if (!item) throw new ServiceError("NOT_FOUND", { itemId: data.itemId });
  if (!item.isConsumable) throw new ServiceError("VALIDATION_ERROR", {}, "Cet objet n'est pas consommable.");

  await removeItemFromInventory(character.id, item.id, 1);

  const effect = (item.metadata ?? {}) as ConsumableEffect;
  const updated = await prisma.character.update({
    where: { id: character.id },
    data: {
      hunger:
        character.hunger != null && effect.restoresHunger
          ? Math.min(NEEDS_MAX, character.hunger + effect.restoresHunger)
          : undefined,
      thirst:
        character.thirst != null && effect.restoresThirst
          ? Math.min(NEEDS_MAX, character.thirst + effect.restoresThirst)
          : undefined,
    },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: "inventory.consume",
    targetType: "Item",
    targetId: item.id,
    metadata: { restoresHunger: effect.restoresHunger, restoresThirst: effect.restoresThirst },
  });

  return { hunger: updated.hunger, thirst: updated.thirst };
}
