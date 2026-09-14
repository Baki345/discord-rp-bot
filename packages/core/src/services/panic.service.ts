import { z } from "zod";
import { prisma, type Prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { isRealOwner, getStaffTier } from "./security-staff.service.js";

export const PanicConfig = z.object({
  enabled: z.boolean().default(false),
  distinctActorsThreshold: z.number().int().min(2).default(2),
  windowSeconds: z.number().int().min(5).default(120),
  autoLockdownOnActivate: z.boolean().default(true),
  autoRestoreLatestBackup: z.boolean().default(true),
  autoUnlockOnEnd: z.boolean().default(true),
  alertRoleId: z.string().nullable().default(null),
  restoreChannels: z.boolean().default(true),
  restoreRoles: z.boolean().default(true),
});
export type PanicConfig = z.infer<typeof PanicConfig>;

export const PanicState = z.object({
  active: z.boolean().default(false),
  activatedAt: z.string().nullable().default(null),
  activatedByDiscordId: z.string().nullable().default(null),
  respondingActorIds: z.array(z.string()).default([]),
});
export type PanicState = z.infer<typeof PanicState>;

export async function getPanicConfig(guildId: string): Promise<PanicConfig> {
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  const parsed = PanicConfig.safeParse(config?.panicConfig ?? {});
  return parsed.success ? parsed.data : PanicConfig.parse({});
}

export async function setPanicConfig(actor: ActorContext, input: { guildId: string; config: Partial<PanicConfig> }) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");
  const current = await getPanicConfig(input.guildId);
  const next = PanicConfig.parse({ ...current, ...input.config });
  await prisma.guildConfig.update({ where: { guildId: input.guildId }, data: { panicConfig: next as Prisma.InputJsonValue } });
  return next;
}

export async function getPanicState(guildId: string): Promise<PanicState> {
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  const parsed = PanicState.safeParse(config?.panicState ?? {});
  return parsed.success ? parsed.data : PanicState.parse({});
}

/** Authority to trigger/end panic mode manually is limited to the owner and extra owners, per spec. */
export async function assertPanicAuthority(guildId: string, discordUserId: string): Promise<void> {
  if (await isRealOwner(guildId, discordUserId)) return;
  if ((await getStaffTier(guildId, discordUserId)) === "EXTRA_OWNER") return;
  throw new ServiceError("FORBIDDEN", {}, "Le mode panique est réservé au propriétaire et aux extra owners.");
}

export async function startPanic(actor: ActorContext, input: { guildId: string; respondingActorIds: string[] }) {
  const current = await getPanicState(input.guildId);
  if (current.active) throw new ServiceError("ALREADY_EXISTS", {}, "Le mode panique est déjà actif.");

  const next = PanicState.parse({
    active: true,
    activatedAt: new Date().toISOString(),
    activatedByDiscordId: actor.discordUserId,
    respondingActorIds: input.respondingActorIds,
  });
  await prisma.guildConfig.update({ where: { guildId: input.guildId }, data: { panicState: next as Prisma.InputJsonValue } });

  await writeAuditLog({
    guildId: input.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "panic.start",
    metadata: { respondingActorIds: input.respondingActorIds },
  });

  return next;
}

export async function endPanic(actor: ActorContext, guildId: string): Promise<PanicState> {
  const current = await getPanicState(guildId);
  if (!current.active) throw new ServiceError("NOT_FOUND", {}, "Le mode panique n'est pas actif.");

  await prisma.guildConfig.update({ where: { guildId }, data: { panicState: PanicState.parse({}) as Prisma.InputJsonValue } });

  await writeAuditLog({
    guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "panic.end",
  });

  return current;
}

export interface ActorBreachEvent {
  actorId: string;
  atMs: number;
}

/**
 * Pure — no I/O. Panic mode is a WAVE (multiple distinct actors tripping
 * anti-nuke's own thresholds within a short window — a coordinated,
 * multi-account attack), distinct from anti-nuke itself which reacts
 * per single actor.
 */
export function checkPanicTrigger(config: PanicConfig, recentBreaches: ActorBreachEvent[], nowMs: number): boolean {
  if (!config.enabled) return false;
  const windowStart = nowMs - config.windowSeconds * 1000;
  const distinctActors = new Set(recentBreaches.filter((b) => b.atMs >= windowStart).map((b) => b.actorId));
  return distinctActors.size >= config.distinctActorsThreshold;
}
