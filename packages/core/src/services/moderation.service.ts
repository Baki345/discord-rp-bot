import { z } from "zod";
import { prisma, type ModerationAction } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";

/**
 * The Discord-side effect (ban/kick/timeout/message purge/nickname edit)
 * always happens in apps/bot BEFORE calling into this service — packages/core
 * never imports discord.js. These functions only persist the case record
 * (the paper trail the dashboard and /mod historique read) and audit log it.
 * Who is allowed to invoke a moderation action is enforced by the bot
 * command's own Discord permission gate (setDefaultMemberPermissions), the
 * same trust boundary /config already uses — there is no RPRole flag for
 * moderation, it isn't an RP-delegable capability.
 */
export const RecordCaseInput = z.object({
  guildId: z.string(),
  targetDiscordId: z.string(),
  reason: z.string().max(500).optional(),
  points: z.number().int().min(0).max(1000).optional(),
  durationMinutes: z.number().int().min(1).optional(),
});
export type RecordCaseInput = z.infer<typeof RecordCaseInput>;

const ACTION_AUDIT_NAME: Record<ModerationAction, string> = {
  WARN: "moderation.warn",
  TIMEOUT: "moderation.timeout",
  UNTIMEOUT: "moderation.untimeout",
  KICK: "moderation.kick",
  BAN: "moderation.ban",
  UNBAN: "moderation.unban",
  QUARANTINE: "moderation.quarantine",
  UNQUARANTINE: "moderation.unquarantine",
  LOCK: "moderation.lock",
  UNLOCK: "moderation.unlock",
};

async function recordCase(actor: ActorContext, action: ModerationAction, input: RecordCaseInput) {
  const data = RecordCaseInput.parse(input);

  const moderationCase = await prisma.moderationCase.create({
    data: {
      guildId: data.guildId,
      targetDiscordId: data.targetDiscordId,
      moderatorId: actor.discordUserId,
      action,
      reason: data.reason,
      points: data.points ?? 0,
      durationMinutes: data.durationMinutes,
    },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: ACTION_AUDIT_NAME[action],
    targetType: "DiscordMember",
    targetId: data.targetDiscordId,
    metadata: { reason: data.reason, points: data.points, durationMinutes: data.durationMinutes },
  });

  return moderationCase;
}

/** Warn accepts a point value — escalation on cumulative points is wired up in M31. */
export async function recordWarn(actor: ActorContext, input: RecordCaseInput) {
  return recordCase(actor, "WARN", input);
}

export async function recordTimeout(actor: ActorContext, input: RecordCaseInput) {
  return recordCase(actor, "TIMEOUT", input);
}

export async function recordUntimeout(actor: ActorContext, input: RecordCaseInput) {
  return recordCase(actor, "UNTIMEOUT", input);
}

export async function recordKick(actor: ActorContext, input: RecordCaseInput) {
  return recordCase(actor, "KICK", input);
}

export async function recordBan(actor: ActorContext, input: RecordCaseInput) {
  return recordCase(actor, "BAN", input);
}

export async function recordUnban(actor: ActorContext, input: RecordCaseInput) {
  return recordCase(actor, "UNBAN", input);
}

export async function recordQuarantine(actor: ActorContext, input: RecordCaseInput) {
  return recordCase(actor, "QUARANTINE", input);
}

export async function recordUnquarantine(actor: ActorContext, input: RecordCaseInput) {
  return recordCase(actor, "UNQUARANTINE", input);
}

export const EditCaseReasonInput = z.object({
  guildId: z.string(),
  caseId: z.string(),
  reason: z.string().max(500),
});
export type EditCaseReasonInput = z.infer<typeof EditCaseReasonInput>;

/** Lets a moderator add/correct a case's reason after the sanction was already applied (e.g. from a quick context-menu action). */
export async function editCaseReason(actor: ActorContext, input: EditCaseReasonInput) {
  const data = EditCaseReasonInput.parse(input);

  const existing = await prisma.moderationCase.findFirst({ where: { id: data.caseId, guildId: data.guildId } });
  if (!existing) throw new ServiceError("NOT_FOUND", { caseId: data.caseId });

  const updated = await prisma.moderationCase.update({ where: { id: existing.id }, data: { reason: data.reason } });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "moderation.edit_case_reason",
    targetType: "ModerationCase",
    targetId: existing.id,
    metadata: { reason: data.reason },
  });

  return updated;
}

/** Case history for one member — what /mod historique and the member-info utility show. */
export async function listCasesForMember(guildId: string, targetDiscordId: string) {
  return prisma.moderationCase.findMany({
    where: { guildId, targetDiscordId },
    orderBy: { createdAt: "desc" },
  });
}

/** Every case in the guild, newest first — what the dashboard case-history page reads. */
export async function listCases(guildId: string, take = 50) {
  return prisma.moderationCase.findMany({
    where: { guildId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/** Sum of WARN points not yet cleared — the running total escalation (M31) will compare against thresholds. */
export async function getWarnPoints(guildId: string, targetDiscordId: string): Promise<number> {
  const result = await prisma.moderationCase.aggregate({
    where: { guildId, targetDiscordId, action: "WARN" },
    _sum: { points: true },
  });
  return result._sum.points ?? 0;
}
