import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { requirePermission } from "../permissions/check-permission.js";
import { getCharacter } from "./character.service.js";
import { addItemToInventory } from "./inventory.service.js";
import { assertAtPlace, getPlace } from "./place.service.js";

export const CreateActivityInput = z.object({
  guildId: z.string(),
  key: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9_-]+$/, "lettres minuscules, chiffres, - et _ uniquement"),
  name: z.string().min(2).max(56),
  cooldownMinutes: z.number().int().min(1).max(10_080).optional(),
  rewardCashMinCents: z.number().int().min(0).optional(),
  rewardCashMaxCents: z.number().int().min(0).optional(),
  rewardItemId: z.string().optional(),
  rewardItemQty: z.number().int().min(1).optional(),
  requiredPlaceId: z.string().optional(),
});
export type CreateActivityInput = z.infer<typeof CreateActivityInput>;

/** Admin-defined generic reward loops (fishing, mining, deliveries, ...) — cooldown enforced per character per activity. */
export async function createActivity(actor: ActorContext, input: CreateActivityInput) {
  const data = CreateActivityInput.parse(input);
  requirePermission(actor, "MANAGE_ACTIVITIES");

  const min = data.rewardCashMinCents ?? 0;
  const max = data.rewardCashMaxCents ?? 0;
  if (min > max) {
    throw new ServiceError("VALIDATION_ERROR", {}, "La récompense minimale ne peut pas dépasser la récompense maximale.");
  }

  const existing = await prisma.activityDefinition.findUnique({
    where: { guildId_key: { guildId: data.guildId, key: data.key } },
  });
  if (existing) throw new ServiceError("ALREADY_EXISTS", { key: data.key });

  const activity = await prisma.activityDefinition.create({
    data: {
      guildId: data.guildId,
      key: data.key,
      name: data.name,
      cooldownMinutes: data.cooldownMinutes ?? 30,
      rewardCashMinCents: min,
      rewardCashMaxCents: max,
      rewardItemId: data.rewardItemId,
      rewardItemQty: data.rewardItemQty ?? 1,
      requiredPlaceId: data.requiredPlaceId,
    },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "activity.create",
    targetType: "ActivityDefinition",
    targetId: activity.id,
    metadata: { name: activity.name },
  });

  return activity;
}

export async function listActivities(guildId: string) {
  return prisma.activityDefinition.findMany({ where: { guildId }, orderBy: { name: "asc" } });
}

export async function getActivity(guildId: string, activityId: string) {
  const activity = await prisma.activityDefinition.findFirst({ where: { id: activityId, guildId } });
  if (!activity) throw new ServiceError("NOT_FOUND", { activityId });
  return activity;
}

export const AttemptActivityInput = z.object({
  guildId: z.string(),
  characterId: z.string(),
  activityId: z.string(),
  discordChannelId: z.string().optional(),
});
export type AttemptActivityInput = z.infer<typeof AttemptActivityInput>;

/** Instant effect + cooldown (no long-running timers) — random cash in the configured range, plus an optional item. */
export async function attemptActivity(actor: ActorContext, input: AttemptActivityInput) {
  const data = AttemptActivityInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  if (actor.discordUserId !== character.discordUserId) throw new ServiceError("FORBIDDEN");

  const activity = await getActivity(data.guildId, data.activityId);
  if (activity.requiredPlaceId) {
    const place = await getPlace(data.guildId, activity.requiredPlaceId);
    assertAtPlace(place, data.discordChannelId);
  }

  const lastAttempt = await prisma.activityAttempt.findFirst({
    where: { activityId: activity.id, characterId: character.id },
    orderBy: { createdAt: "desc" },
  });
  if (lastAttempt) {
    const cooldownEndsAt = new Date(lastAttempt.createdAt.getTime() + activity.cooldownMinutes * 60_000);
    if (cooldownEndsAt.getTime() > Date.now()) {
      const remainingMin = Math.ceil((cooldownEndsAt.getTime() - Date.now()) / 60_000);
      throw new ServiceError("VALIDATION_ERROR", { remainingMin }, `Encore en recharge — réessaie dans ${remainingMin} min.`);
    }
  }

  const rewardCents = Math.round(activity.rewardCashMinCents + Math.random() * (activity.rewardCashMaxCents - activity.rewardCashMinCents));

  await prisma.$transaction([
    prisma.character.update({ where: { id: character.id }, data: { cashCents: { increment: rewardCents } } }),
    prisma.activityAttempt.create({
      data: { guildId: data.guildId, activityId: activity.id, characterId: character.id, rewardCashCents: rewardCents },
    }),
  ]);

  if (activity.rewardItemId) {
    await addItemToInventory(data.guildId, character.id, activity.rewardItemId, activity.rewardItemQty);
  }

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: "activity.attempt",
    targetType: "ActivityDefinition",
    targetId: activity.id,
    metadata: { rewardCents, rewardItemId: activity.rewardItemId, rewardItemQty: activity.rewardItemQty },
  });

  return { rewardCents, rewardItemId: activity.rewardItemId, rewardItemQty: activity.rewardItemQty };
}
