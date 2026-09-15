import { z } from "zod";
import { prisma, type Prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";

export const VerificationMethod = z.enum(["BUTTON", "MODAL", "GRID_CAPTCHA", "WEB", "INSTANT"]);
export type VerificationMethod = z.infer<typeof VerificationMethod>;

export const VerificationConfig = z.object({
  enabled: z.boolean().default(false),
  method: VerificationMethod.default("BUTTON"),
  target: z.enum(["ALL", "SUSPECT_ONLY"]).default("ALL"),
  verifiedRoleId: z.string().nullable().default(null),
  failAction: z.enum(["KICK", "BAN", "NONE"]).default("NONE"),
  timeoutMinutes: z.number().int().min(1).max(10_080).default(60),
  /** Legacy mode from the spec: quarantine immediately on join instead of waiting for a fail/timeout — deliberately discouraged, kept for parity. */
  legacyQuarantineOnJoin: z.boolean().default(false),
  successMessage: z.string().min(1).default("✅ Tu es vérifié·e !"),
});
export type VerificationConfig = z.infer<typeof VerificationConfig>;

export async function getVerificationConfig(guildId: string): Promise<VerificationConfig> {
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  const parsed = VerificationConfig.safeParse(config?.verificationConfig ?? {});
  return parsed.success ? parsed.data : VerificationConfig.parse({});
}

export async function setVerificationConfig(actor: ActorContext, input: { guildId: string; config: Partial<VerificationConfig> }) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");

  const current = await getVerificationConfig(input.guildId);
  const next = VerificationConfig.parse({ ...current, ...input.config });

  await prisma.guildConfig.update({ where: { guildId: input.guildId }, data: { verificationConfig: next as Prisma.InputJsonValue } });

  await writeAuditLog({
    guildId: input.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "verification.set_config",
    targetType: "GuildConfig",
    metadata: { config: next },
  });

  return next;
}

/** A member is still within their grace period if they joined less than timeoutMinutes ago — pure, so it's directly unit-testable. */
export function hasVerificationExpired(joinedAt: Date, timeoutMinutes: number, now: Date = new Date()): boolean {
  return now.getTime() - joinedAt.getTime() > timeoutMinutes * 60_000;
}

export async function recordManualVerification(actor: ActorContext, input: { guildId: string; targetDiscordId: string }) {
  await writeAuditLog({
    guildId: input.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "verification.manual",
    targetType: "DiscordMember",
    targetId: input.targetDiscordId,
  });
}

// ============================= WEB VERIFICATION HANDOFF =============================

/**
 * Idempotent by design: the dashboard button that calls this has no
 * client-side disable-on-click guard, and nothing stops a signed-in user
 * from submitting it repeatedly. Returning the existing pending attempt
 * instead of always inserting a new row closes an unbounded-write path —
 * an authenticated user could otherwise flood this table for free, and
 * the bot's ticker would re-process every duplicate.
 */
export async function recordWebVerificationAttempt(input: { guildId: string; discordUserId: string }) {
  const pending = await prisma.verificationAttempt.findFirst({
    where: { guildId: input.guildId, discordUserId: input.discordUserId, method: "web", processedAt: null },
  });
  if (pending) return pending;

  return prisma.verificationAttempt.create({
    data: { guildId: input.guildId, discordUserId: input.discordUserId, method: "web" },
  });
}

/** Polled by the bot's web-verification ticker — mirrors M9's audit-log mirror pattern. */
export async function listUnprocessedWebVerificationAttempts(take = 20) {
  return prisma.verificationAttempt.findMany({
    where: { processedAt: null, method: "web" },
    orderBy: { completedAt: "asc" },
    take,
  });
}

export async function markVerificationAttemptProcessed(id: string) {
  await prisma.verificationAttempt.update({ where: { id }, data: { processedAt: new Date() } });
}

/** Guilds whose verification is turned on — used by the bot's timeout ticker to know which guilds to scan. */
export async function listGuildsWithVerificationEnabled(): Promise<string[]> {
  const configs = await prisma.guildConfig.findMany({
    where: { verificationConfig: { path: ["enabled"], equals: true } },
    select: { guildId: true },
  });
  return configs.map((c) => c.guildId);
}
