import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { requirePermission } from "../permissions/check-permission.js";

export async function getActiveSession(guildId: string) {
  return prisma.rPSession.findFirst({ where: { guildId, endedAt: null }, orderBy: { startedAt: "desc" } });
}

export const StartSessionInput = z.object({ guildId: z.string() });
export type StartSessionInput = z.infer<typeof StartSessionInput>;

export async function startSession(actor: ActorContext, input: StartSessionInput) {
  const data = StartSessionInput.parse(input);
  requirePermission(actor, "MANAGE_SESSIONS");

  const active = await getActiveSession(data.guildId);
  if (active) throw new ServiceError("ALREADY_EXISTS", {}, "Une session RP est déjà en cours.");

  const rpSession = await prisma.rPSession.create({
    data: { guildId: data.guildId, startedByDiscordId: actor.discordUserId },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "session.start",
    targetType: "RPSession",
    targetId: rpSession.id,
  });

  return rpSession;
}

export const EndSessionInput = z.object({ guildId: z.string() });
export type EndSessionInput = z.infer<typeof EndSessionInput>;

export async function endSession(actor: ActorContext, input: EndSessionInput) {
  const data = EndSessionInput.parse(input);
  requirePermission(actor, "MANAGE_SESSIONS");

  const active = await getActiveSession(data.guildId);
  if (!active) throw new ServiceError("NOT_FOUND", {}, "Aucune session RP en cours.");

  const rpSession = await prisma.rPSession.update({ where: { id: active.id }, data: { endedAt: new Date() } });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "session.end",
    targetType: "RPSession",
    targetId: rpSession.id,
  });

  return rpSession;
}

export async function listSessions(guildId: string, limit = 20) {
  return prisma.rPSession.findMany({ where: { guildId }, orderBy: { startedAt: "desc" }, take: limit });
}

/** Called from economy/job services when a guild has requireActiveSession on — a no-op otherwise. */
export async function assertSessionActiveIfRequired(guildId: string) {
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  if (!config?.requireActiveSession) return;
  const active = await getActiveSession(guildId);
  if (!active) {
    throw new ServiceError("VALIDATION_ERROR", {}, "Aucune session RP en cours — un membre du staff doit lancer `/session start`.");
  }
}
