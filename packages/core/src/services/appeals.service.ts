import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";

export const SubmitAppealInput = z.object({
  guildId: z.string(),
  caseIdSuffix: z.string().min(4),
  message: z.string().min(1).max(1000),
});
export type SubmitAppealInput = z.infer<typeof SubmitAppealInput>;

/**
 * Accepts a short case-ID SUFFIX (what /mod historique and /mes-sanctions
 * show) rather than the full cuid — cuid2's leading characters are
 * timestamp-based, so cases created close together in time (routine —
 * several sanctions in one moderation session) commonly share the same
 * 8-char *prefix*; the trailing characters carry the actual randomness,
 * so a suffix is what's actually likely to be unique.
 */
export async function submitAppeal(actor: ActorContext, input: SubmitAppealInput) {
  const data = SubmitAppealInput.parse(input);

  const matches = await prisma.moderationCase.findMany({
    where: { guildId: data.guildId, id: { endsWith: data.caseIdSuffix } },
    take: 2,
  });
  if (matches.length === 0) throw new ServiceError("NOT_FOUND", {}, "Aucun cas ne correspond à cet identifiant.");
  if (matches.length > 1) throw new ServiceError("VALIDATION_ERROR", {}, "Plusieurs cas correspondent — précise l'identifiant.");
  const moderationCase = matches[0]!;

  if (moderationCase.targetDiscordId !== actor.discordUserId) {
    throw new ServiceError("FORBIDDEN", {}, "Tu ne peux faire appel que de tes propres sanctions.");
  }

  const existingPending = await prisma.appeal.findFirst({ where: { caseId: moderationCase.id, status: "PENDING" } });
  if (existingPending) throw new ServiceError("ALREADY_EXISTS", {}, "Un appel est déjà en attente pour ce cas.");

  const appeal = await prisma.appeal.create({
    data: { guildId: data.guildId, caseId: moderationCase.id, discordUserId: actor.discordUserId, message: data.message },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: "DISCORD_USER",
    actorDiscordId: actor.discordUserId,
    action: "appeal.submit",
    targetType: "Appeal",
    targetId: appeal.id,
    metadata: { caseId: moderationCase.id },
  });

  return { appeal, moderationCase };
}

export const ReviewAppealInput = z.object({
  guildId: z.string(),
  appealId: z.string(),
  accept: z.boolean(),
});
export type ReviewAppealInput = z.infer<typeof ReviewAppealInput>;

export async function reviewAppeal(actor: ActorContext, input: ReviewAppealInput) {
  const data = ReviewAppealInput.parse(input);

  const appeal = await prisma.appeal.findFirst({ where: { id: data.appealId, guildId: data.guildId }, include: { case: true } });
  if (!appeal) throw new ServiceError("NOT_FOUND", { appealId: data.appealId });
  if (appeal.status !== "PENDING") throw new ServiceError("VALIDATION_ERROR", {}, "Cet appel a déjà été traité.");

  const updated = await prisma.appeal.update({
    where: { id: appeal.id },
    data: { status: data.accept ? "ACCEPTED" : "REJECTED", resolvedBy: actor.discordUserId, resolvedAt: new Date() },
    include: { case: true },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "appeal.review",
    targetType: "Appeal",
    targetId: appeal.id,
    metadata: { accepted: data.accept, caseId: appeal.caseId },
  });

  return updated;
}

export async function listPendingAppeals(guildId: string) {
  return prisma.appeal.findMany({ where: { guildId, status: "PENDING" }, include: { case: true }, orderBy: { createdAt: "asc" } });
}

export async function listAppealsForMember(guildId: string, discordUserId: string) {
  return prisma.appeal.findMany({ where: { guildId, discordUserId }, include: { case: true }, orderBy: { createdAt: "desc" } });
}

export async function getAppeal(guildId: string, appealId: string) {
  const appeal = await prisma.appeal.findFirst({ where: { id: appealId, guildId }, include: { case: true } });
  if (!appeal) throw new ServiceError("NOT_FOUND", { appealId });
  return appeal;
}
