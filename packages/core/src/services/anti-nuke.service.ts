import { z } from "zod";
import { prisma, type Prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";

export const AntiNukeConfig = z.object({
  enabled: z.boolean().default(false),
  strictMode: z.boolean().default(false),
  perMinuteThreshold: z.number().int().min(1).default(5),
  perHourThreshold: z.number().int().min(1).default(15),
  whitelistedCategoryIds: z.array(z.string()).default([]),
  whitelistedDiscordIds: z.array(z.string()).default([]),
  autoQuarantineOnBreach: z.boolean().default(true),
});
export type AntiNukeConfig = z.infer<typeof AntiNukeConfig>;

export async function getAntiNukeConfig(guildId: string): Promise<AntiNukeConfig> {
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  const parsed = AntiNukeConfig.safeParse(config?.antiNukeConfig ?? {});
  return parsed.success ? parsed.data : AntiNukeConfig.parse({});
}

export async function setAntiNukeConfig(actor: ActorContext, input: { guildId: string; config: Partial<AntiNukeConfig> }) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");

  const current = await getAntiNukeConfig(input.guildId);
  const next = AntiNukeConfig.parse({ ...current, ...input.config });

  await prisma.guildConfig.update({ where: { guildId: input.guildId }, data: { antiNukeConfig: next as Prisma.InputJsonValue } });

  await writeAuditLog({
    guildId: input.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "antinuke.set_config",
    targetType: "GuildConfig",
    metadata: { config: next },
  });

  return next;
}

export async function listGuildsWithAntiNukeEnabled(): Promise<string[]> {
  const configs = await prisma.guildConfig.findMany({
    where: { antiNukeConfig: { path: ["enabled"], equals: true } },
    select: { guildId: true },
  });
  return configs.map((c) => c.guildId);
}

export function isActorWhitelisted(config: AntiNukeConfig, discordId: string): boolean {
  return config.whitelistedDiscordIds.includes(discordId);
}

export function isCategoryWhitelisted(config: AntiNukeConfig, categoryId: string | null | undefined): boolean {
  return categoryId !== null && categoryId !== undefined && config.whitelistedCategoryIds.includes(categoryId);
}

/**
 * Discord audit-log action type NAMES (matching discord.js's AuditLogEvent
 * enum keys) this system tracks per actor. Kept as plain strings rather
 * than importing discord.js's enum — packages/core stays framework-free —
 * apps/bot does `AuditLogEvent[entry.action]` to get the name and passes
 * it in here.
 */
export const BASE_TRACKED_AUDIT_EVENTS = [
  "ChannelCreate",
  "ChannelDelete",
  "RoleCreate",
  "RoleDelete",
  "MemberBanAdd",
  "MemberKick",
  "MemberPrune",
  "WebhookCreate",
  "WebhookDelete",
] as const;

/**
 * Strict mode adds edits that are more prone to false positives (a
 * legitimate admin reorganizing roles or channels) but are exactly what a
 * compromised account would also do. ChannelUpdate matters here because a
 * "silent" nuke doesn't have to delete anything: mass-editing every
 * channel's permission overwrites (to expose everything publicly, or lock
 * everyone else out) evades ChannelDelete-based detection entirely while
 * doing comparable damage.
 */
export const STRICT_MODE_EXTRA_AUDIT_EVENTS = ["RoleUpdate", "MemberRoleUpdate", "GuildUpdate", "ChannelUpdate"] as const;

export function isTrackedDestructiveAction(eventName: string, strictMode: boolean): boolean {
  if ((BASE_TRACKED_AUDIT_EVENTS as readonly string[]).includes(eventName)) return true;
  return strictMode && (STRICT_MODE_EXTRA_AUDIT_EVENTS as readonly string[]).includes(eventName);
}

export interface ThresholdCheckResult {
  breached: boolean;
  windowBreached: "MINUTE" | "HOUR" | null;
  countLastMinute: number;
  countLastHour: number;
}

/** Pure — no I/O. The caller (apps/bot) maintains the actor's rolling timestamp list; this just decides whether it crosses either configured threshold. */
export function checkThresholdBreach(config: AntiNukeConfig, actorTimestampsMs: number[], nowMs: number): ThresholdCheckResult {
  const countLastMinute = actorTimestampsMs.filter((t) => nowMs - t < 60_000).length;
  const countLastHour = actorTimestampsMs.filter((t) => nowMs - t < 3_600_000).length;

  if (countLastMinute >= config.perMinuteThreshold) return { breached: true, windowBreached: "MINUTE", countLastMinute, countLastHour };
  if (countLastHour >= config.perHourThreshold) return { breached: true, windowBreached: "HOUR", countLastMinute, countLastHour };
  return { breached: false, windowBreached: null, countLastMinute, countLastHour };
}

export async function recordAntiNukeIncident(input: {
  guildId: string;
  actorId: string;
  kind: string;
  details: Record<string, unknown>;
  autoQuarantined: boolean;
}) {
  await prisma.securityIncident.create({
    data: {
      guildId: input.guildId,
      actorId: input.actorId,
      kind: "anti_nuke",
      details: { subKind: input.kind, ...input.details } as Prisma.InputJsonValue,
      autoQuarantined: input.autoQuarantined,
    },
  });

  await writeAuditLog({
    guildId: input.guildId,
    actorType: "SYSTEM",
    action: `antinuke.${input.kind}`,
    targetType: "DiscordMember",
    targetId: input.actorId,
    metadata: { ...input.details, autoQuarantined: input.autoQuarantined },
  });
}

export async function listAntiNukeIncidents(guildId: string, take = 50) {
  return prisma.securityIncident.findMany({ where: { guildId, kind: "anti_nuke" }, orderBy: { createdAt: "desc" }, take });
}
