import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { requirePermission } from "../permissions/check-permission.js";
import { isFeatureEnabled } from "../quota/quota-service.js";
import { getCharacter } from "./character.service.js";
import { countOnDutyLawEnforcement } from "./job.service.js";
import { assertAtPlace, getPlace } from "./place.service.js";

export const CreateRobberyTargetInput = z.object({
  guildId: z.string(),
  key: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9_-]+$/, "lettres minuscules, chiffres, - et _ uniquement"),
  name: z.string().min(2).max(56),
  rewardMinCents: z.number().int().min(0),
  rewardMaxCents: z.number().int().min(0),
  cooldownMinutes: z.number().int().min(1).max(10_080).optional(),
  minPoliceOnDuty: z.number().int().min(0).optional(),
  successChancePct: z.number().int().min(1).max(100).optional(),
  jailMinutes: z.number().int().min(0).max(1440).optional(),
  placeId: z.string().optional(),
});
export type CreateRobberyTargetInput = z.infer<typeof CreateRobberyTargetInput>;

export async function createRobberyTarget(actor: ActorContext, input: CreateRobberyTargetInput) {
  const data = CreateRobberyTargetInput.parse(input);
  requirePermission(actor, "MANAGE_ECONOMY");

  if (data.rewardMinCents > data.rewardMaxCents) {
    throw new ServiceError("VALIDATION_ERROR", {}, "La récompense minimale ne peut pas dépasser la récompense maximale.");
  }

  const existing = await prisma.robberyTarget.findUnique({ where: { guildId_key: { guildId: data.guildId, key: data.key } } });
  if (existing) throw new ServiceError("ALREADY_EXISTS", { key: data.key });

  const target = await prisma.robberyTarget.create({
    data: {
      guildId: data.guildId,
      key: data.key,
      name: data.name,
      rewardMinCents: data.rewardMinCents,
      rewardMaxCents: data.rewardMaxCents,
      cooldownMinutes: data.cooldownMinutes ?? 60,
      minPoliceOnDuty: data.minPoliceOnDuty ?? 0,
      successChancePct: data.successChancePct ?? 50,
      jailMinutes: data.jailMinutes ?? 15,
      placeId: data.placeId,
    },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "robbery.target_create",
    targetType: "RobberyTarget",
    targetId: target.id,
    metadata: { name: target.name },
  });

  return target;
}

export async function listRobberyTargets(guildId: string) {
  return prisma.robberyTarget.findMany({ where: { guildId }, orderBy: { name: "asc" } });
}

export async function getRobberyTarget(guildId: string, targetId: string) {
  const target = await prisma.robberyTarget.findFirst({ where: { id: targetId, guildId } });
  if (!target) throw new ServiceError("NOT_FOUND", { targetId });
  return target;
}

export const AttemptRobberyInput = z.object({
  guildId: z.string(),
  characterId: z.string(),
  targetId: z.string(),
  discordChannelId: z.string().optional(),
});
export type AttemptRobberyInput = z.infer<typeof AttemptRobberyInput>;

/** Instant effect + cooldown, like activities/drugs — no long-running timers. A failed roll jails the character. */
export async function attemptRobbery(actor: ActorContext, input: AttemptRobberyInput) {
  const data = AttemptRobberyInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  if (actor.discordUserId !== character.discordUserId) throw new ServiceError("FORBIDDEN");

  if (character.jailedUntil && character.jailedUntil.getTime() > Date.now()) {
    throw new ServiceError("VALIDATION_ERROR", {}, `Tu es en prison jusqu'à <t:${Math.floor(character.jailedUntil.getTime() / 1000)}:R>.`);
  }

  const enabled = await isFeatureEnabled(data.guildId, "robbery");
  if (!enabled) {
    throw new ServiceError("VALIDATION_ERROR", {}, "Les braquages ne sont pas activés sur ce serveur (nécessite un plan supérieur).");
  }

  const target = await getRobberyTarget(data.guildId, data.targetId);

  if (target.placeId) {
    const place = await getPlace(data.guildId, target.placeId);
    assertAtPlace(place, data.discordChannelId);
  }

  const lastAttempt = await prisma.robberyAttempt.findFirst({
    where: { targetId: target.id, characterId: character.id },
    orderBy: { createdAt: "desc" },
  });
  if (lastAttempt) {
    const cooldownEndsAt = new Date(lastAttempt.createdAt.getTime() + target.cooldownMinutes * 60_000);
    if (cooldownEndsAt.getTime() > Date.now()) {
      const remainingMin = Math.ceil((cooldownEndsAt.getTime() - Date.now()) / 60_000);
      throw new ServiceError("VALIDATION_ERROR", { remainingMin }, `Encore en recharge — réessaie dans ${remainingMin} min.`);
    }
  }

  if (target.minPoliceOnDuty > 0) {
    const onDutyCount = await countOnDutyLawEnforcement(data.guildId);
    if (onDutyCount < target.minPoliceOnDuty) {
      throw new ServiceError(
        "VALIDATION_ERROR",
        { onDutyCount, required: target.minPoliceOnDuty },
        `Pas assez de policiers en service (${onDutyCount}/${target.minPoliceOnDuty} requis).`,
      );
    }
  }

  const success = Math.random() * 100 < target.successChancePct;
  const rewardCents = success
    ? Math.round(target.rewardMinCents + Math.random() * (target.rewardMaxCents - target.rewardMinCents))
    : 0;
  const jailedUntil = success ? null : new Date(Date.now() + target.jailMinutes * 60_000);

  await prisma.$transaction([
    prisma.robberyAttempt.create({
      data: { guildId: data.guildId, targetId: target.id, characterId: character.id, success, rewardCents },
    }),
    ...(success
      ? [prisma.character.update({ where: { id: character.id }, data: { cashCents: { increment: rewardCents } } })]
      : [prisma.character.update({ where: { id: character.id }, data: { jailedUntil } })]),
  ]);

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: success ? "robbery.success" : "robbery.fail",
    targetType: "RobberyTarget",
    targetId: target.id,
    metadata: { rewardCents, jailedUntil },
  });

  return { success, rewardCents, jailedUntil };
}
