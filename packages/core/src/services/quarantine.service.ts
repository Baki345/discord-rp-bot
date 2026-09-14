import { z } from "zod";
import { prisma, type Prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { assertModerationAllowed } from "./security-staff.service.js";
import { recordQuarantine, recordUnquarantine } from "./moderation.service.js";

export async function getQuarantineRoleId(guildId: string): Promise<string | null> {
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  return config?.quarantineRoleId ?? null;
}

/** Called once by the bot after it creates the Discord role — stores the id, does not create the role itself (packages/core is framework-free). */
export async function setQuarantineRoleId(actor: ActorContext, input: { guildId: string; roleId: string }) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");
  return prisma.guildConfig.update({ where: { guildId: input.guildId }, data: { quarantineRoleId: input.roleId } });
}

export async function getActiveQuarantine(guildId: string, discordUserId: string) {
  return prisma.quarantineRecord.findFirst({ where: { guildId, discordUserId, releasedAt: null } });
}

export async function listActiveQuarantines(guildId: string) {
  return prisma.quarantineRecord.findMany({ where: { guildId, releasedAt: null }, orderBy: { quarantinedAt: "desc" } });
}

export const StartQuarantineInput = z.object({
  guildId: z.string(),
  discordUserId: z.string(),
  priorRoleIds: z.array(z.string()),
  reason: z.string().max(500).optional(),
});
export type StartQuarantineInput = z.infer<typeof StartQuarantineInput>;

/**
 * Persists the isolation state (and the case record) BEFORE the bot applies
 * the actual role change — if this throws (immunity, already quarantined),
 * the bot must not touch the member's Discord roles at all.
 */
export async function startQuarantine(actor: ActorContext, input: StartQuarantineInput) {
  const data = StartQuarantineInput.parse(input);
  await assertModerationAllowed(data.guildId, actor.discordUserId, data.discordUserId);

  const existing = await getActiveQuarantine(data.guildId, data.discordUserId);
  if (existing) throw new ServiceError("ALREADY_EXISTS", {}, "Ce membre est déjà en quarantaine.");

  const record = await prisma.quarantineRecord.upsert({
    where: { discordUserId: data.discordUserId },
    update: {
      guildId: data.guildId,
      priorRoleIds: data.priorRoleIds as Prisma.InputJsonValue,
      reason: data.reason,
      quarantinedAt: new Date(),
      releasedAt: null,
    },
    create: {
      guildId: data.guildId,
      discordUserId: data.discordUserId,
      priorRoleIds: data.priorRoleIds as Prisma.InputJsonValue,
      reason: data.reason,
    },
  });

  await recordQuarantine(actor, { guildId: data.guildId, targetDiscordId: data.discordUserId, reason: data.reason });

  return record;
}

export const EndQuarantineInput = z.object({ guildId: z.string(), discordUserId: z.string(), reason: z.string().max(500).optional() });
export type EndQuarantineInput = z.infer<typeof EndQuarantineInput>;

/** Returns the prior role ids so the bot can restore them — the DB row is marked released whether or not the bot succeeds at restoring roles. */
export async function endQuarantine(actor: ActorContext, input: EndQuarantineInput): Promise<string[]> {
  const data = EndQuarantineInput.parse(input);
  const existing = await getActiveQuarantine(data.guildId, data.discordUserId);
  if (!existing) throw new ServiceError("NOT_FOUND", {}, "Ce membre n'est pas en quarantaine.");

  await prisma.quarantineRecord.update({ where: { id: existing.id }, data: { releasedAt: new Date() } });
  await recordUnquarantine(actor, { guildId: data.guildId, targetDiscordId: data.discordUserId, reason: data.reason });

  return existing.priorRoleIds as string[];
}
