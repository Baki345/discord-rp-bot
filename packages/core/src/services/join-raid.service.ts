import { z } from "zod";
import { prisma, type Prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { JoinGateAction } from "./join-gate.service.js";

export const IdSimilarityGranularity = z.enum(["OFF", "DAY", "MONTH", "ADAPTIVE"]);
export type IdSimilarityGranularity = z.infer<typeof IdSimilarityGranularity>;

export const JoinRaidConfig = z.object({
  enabled: z.boolean().default(false),
  windowSeconds: z.number().int().min(5).max(3600).default(60),
  minJoins: z.number().int().min(2).max(1000).default(5),
  target: z.enum(["ALL", "SUSPECT_ONLY"]).default("ALL"),
  accountAgeFlagMinutes: z.number().int().min(0).optional(),
  noAvatarFlag: z.boolean().optional(),
  idSimilarity: IdSimilarityGranularity.optional(),
  minFlagMatches: z.number().int().min(1).max(3).default(1),
  action: JoinGateAction.default("KICK"),
  alertRoleId: z.string().nullable().optional(),
  subsequentWindowSeconds: z.number().int().min(0).max(3600).default(300),
  /**
   * Beyond individually kicking/banning matched joiners, also pause invites
   * and block every new arrival (via the same mechanism as a manual
   * `/lockdown serveur`) the moment a raid is confirmed — stops the raid at
   * the door instead of processing joiners one by one. Off by default: this
   * is a stronger, more disruptive response than the per-member action, and
   * once engaged it stays active until staff run `/lockdown fin` (it does
   * NOT auto-lift), so an admin should opt in deliberately.
   */
  autoLockdownOnTrigger: z.boolean().default(false),
});
export type JoinRaidConfig = z.infer<typeof JoinRaidConfig>;

export async function getJoinRaidConfig(guildId: string): Promise<JoinRaidConfig> {
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  const parsed = JoinRaidConfig.safeParse(config?.joinRaidConfig ?? {});
  return parsed.success ? parsed.data : JoinRaidConfig.parse({});
}

export async function setJoinRaidConfig(actor: ActorContext, input: { guildId: string; config: Partial<JoinRaidConfig> }) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");

  const current = await getJoinRaidConfig(input.guildId);
  const next = JoinRaidConfig.parse({ ...current, ...input.config });

  await prisma.guildConfig.update({ where: { guildId: input.guildId }, data: { joinRaidConfig: next as Prisma.InputJsonValue } });

  await writeAuditLog({
    guildId: input.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "joinraid.set_config",
    targetType: "GuildConfig",
    metadata: { config: next },
  });

  return next;
}

export interface JoinRaidMemberInfo {
  discordUserId: string;
  joinedAt: Date;
  accountCreatedAt: Date;
  hasAvatar: boolean;
}

export interface JoinRaidResult {
  triggered: boolean;
  matchedMemberIds: string[];
  reason: string;
}

function similarityBucket(createdAt: Date, granularity: IdSimilarityGranularity): string {
  const iso = createdAt.toISOString();
  if (granularity === "MONTH") return iso.slice(0, 7); // YYYY-MM
  if (granularity === "ADAPTIVE") return iso.slice(0, 13); // YYYY-MM-DDTHH — catches accounts created within the same hour
  return iso.slice(0, 10); // DAY: YYYY-MM-DD
}

function countFlags(config: JoinRaidConfig, member: JoinRaidMemberInfo, windowMembers: JoinRaidMemberInfo[]): number {
  let flags = 0;

  if (config.accountAgeFlagMinutes != null) {
    const ageMinutes = (member.joinedAt.getTime() - member.accountCreatedAt.getTime()) / 60_000;
    if (ageMinutes < config.accountAgeFlagMinutes) flags++;
  }

  if (config.noAvatarFlag && !member.hasAvatar) flags++;

  if (config.idSimilarity && config.idSimilarity !== "OFF") {
    const bucket = similarityBucket(member.accountCreatedAt, config.idSimilarity);
    const matches = windowMembers.filter((m) => similarityBucket(m.accountCreatedAt, config.idSimilarity!) === bucket).length;
    if (matches >= 2) flags++;
  }

  return flags;
}

/**
 * Pure — no I/O, so directly unit-testable. `recentJoins` should already be
 * pruned to the configured window by the caller (apps/bot's in-memory ring
 * buffer); `now` is a parameter rather than Date.now() so tests are
 * deterministic.
 */
export function detectJoinRaid(config: JoinRaidConfig, recentJoins: JoinRaidMemberInfo[], now: Date = new Date()): JoinRaidResult {
  if (!config.enabled) return { triggered: false, matchedMemberIds: [], reason: "disabled" };

  const windowStart = now.getTime() - config.windowSeconds * 1000;
  const inWindow = recentJoins.filter((m) => m.joinedAt.getTime() >= windowStart);

  const pool =
    config.target === "ALL"
      ? inWindow
      : inWindow.filter((m) => countFlags(config, m, inWindow) >= config.minFlagMatches);

  if (pool.length < config.minJoins) {
    return { triggered: false, matchedMemberIds: [], reason: `only ${pool.length}/${config.minJoins} qualifying joins in window` };
  }

  return {
    triggered: true,
    matchedMemberIds: pool.map((m) => m.discordUserId),
    reason: `${pool.length} joins (target=${config.target}) within ${config.windowSeconds}s`,
  };
}

export async function recordJoinRaidIncident(guildId: string, matchedMemberIds: string[], reason: string) {
  return prisma.securityIncident.create({
    data: {
      guildId,
      actorId: matchedMemberIds[0] ?? "unknown",
      kind: "join_raid",
      details: { matchedMemberIds, reason } as Prisma.InputJsonValue,
    },
  });
}

export async function listSecurityIncidents(guildId: string, kind?: string, take = 50) {
  return prisma.securityIncident.findMany({ where: { guildId, kind }, orderBy: { createdAt: "desc" }, take });
}
