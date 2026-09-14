import { z } from "zod";
import { prisma, type Prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";

export const JoinGateAction = z.enum(["LOG", "TIMEOUT", "KICK", "BAN"]);
export type JoinGateAction = z.infer<typeof JoinGateAction>;

/** Ranks how severe an action is, so when several filters trigger at once only the strictest one is actually applied. */
const ACTION_SEVERITY: Record<JoinGateAction, number> = { LOG: 0, TIMEOUT: 1, KICK: 2, BAN: 3 };

const FilterSetting = z.object({ enabled: z.boolean(), action: JoinGateAction });

export const JoinGateConfig = z.object({
  noAvatar: FilterSetting.optional(),
  minAccountAge: FilterSetting.extend({ minutes: z.number().int().min(0), dmMinimumAge: z.boolean().optional() }).optional(),
  unauthorizedBotAdd: FilterSetting.extend({ authorizedAdderIds: z.array(z.string()) }).optional(),
  unverifiedBot: FilterSetting.optional(),
  inviteInUsername: FilterSetting.optional(),
  suspiciousAccount: FilterSetting.optional(),
  nicknameBlacklist: FilterSetting.extend({ patterns: z.array(z.string()) }).optional(),
});
export type JoinGateConfig = z.infer<typeof JoinGateConfig>;

export const JOIN_GATE_FILTERS = [
  "noAvatar",
  "minAccountAge",
  "unauthorizedBotAdd",
  "unverifiedBot",
  "inviteInUsername",
  "suspiciousAccount",
  "nicknameBlacklist",
] as const;
export type JoinGateFilterName = (typeof JOIN_GATE_FILTERS)[number];

export async function getJoinGateConfig(guildId: string): Promise<JoinGateConfig> {
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  const parsed = JoinGateConfig.safeParse(config?.joinGateConfig ?? {});
  return parsed.success ? parsed.data : {};
}

export const SetJoinGateFilterInput = z.object({
  guildId: z.string(),
  filter: z.enum(JOIN_GATE_FILTERS),
  settings: z.record(z.string(), z.unknown()).nullable(), // null = disable/clear this filter
});
export type SetJoinGateFilterInput = z.infer<typeof SetJoinGateFilterInput>;

export async function setJoinGateFilter(actor: ActorContext, input: SetJoinGateFilterInput) {
  const data = SetJoinGateFilterInput.parse(input);
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");

  const current = await getJoinGateConfig(data.guildId);
  const next: JoinGateConfig = { ...current };
  if (data.settings === null) {
    delete next[data.filter];
  } else {
    next[data.filter] = data.settings as never;
  }

  const validated = JoinGateConfig.parse(next);
  await prisma.guildConfig.update({
    where: { guildId: data.guildId },
    data: { joinGateConfig: validated as Prisma.InputJsonValue },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "joingate.set_filter",
    targetType: "GuildConfig",
    metadata: { filter: data.filter, settings: data.settings },
  });

  return validated;
}

export interface JoinGateMemberInfo {
  username: string;
  hasAvatar: boolean;
  accountCreatedAt: Date;
  isBot: boolean;
  isVerifiedBot: boolean;
  /** Discord user id of whoever added this bot, when known (audit-log lookup, done in apps/bot). */
  adderDiscordId?: string;
}

export interface JoinGateTrigger {
  filter: JoinGateFilterName;
  action: JoinGateAction;
}

const DISCORD_INVITE_PATTERN = /(discord\.gg|discord(app)?\.com\/invite)\/[a-z0-9-]+/i;

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

/**
 * Pure evaluation — no I/O, so it's directly unit-testable. Returns every
 * filter that triggered; the caller picks the single strictest action
 * (pickStrictestAction) since a member can only be timed out OR kicked OR
 * banned once, not all three.
 */
export function evaluateJoinGate(config: JoinGateConfig, info: JoinGateMemberInfo): JoinGateTrigger[] {
  const triggers: JoinGateTrigger[] = [];

  if (config.noAvatar?.enabled && !info.hasAvatar) {
    triggers.push({ filter: "noAvatar", action: config.noAvatar.action });
  }

  if (config.minAccountAge?.enabled) {
    const ageMinutes = (Date.now() - info.accountCreatedAt.getTime()) / 60_000;
    if (ageMinutes < config.minAccountAge.minutes) {
      triggers.push({ filter: "minAccountAge", action: config.minAccountAge.action });
    }
  }

  if (info.isBot && config.unauthorizedBotAdd?.enabled) {
    const authorized = info.adderDiscordId && config.unauthorizedBotAdd.authorizedAdderIds.includes(info.adderDiscordId);
    if (!authorized) triggers.push({ filter: "unauthorizedBotAdd", action: config.unauthorizedBotAdd.action });
  }

  if (info.isBot && config.unverifiedBot?.enabled && !info.isVerifiedBot) {
    triggers.push({ filter: "unverifiedBot", action: config.unverifiedBot.action });
  }

  if (!info.isBot && config.inviteInUsername?.enabled && DISCORD_INVITE_PATTERN.test(info.username)) {
    triggers.push({ filter: "inviteInUsername", action: config.inviteInUsername.action });
  }

  if (!info.isBot && config.suspiciousAccount?.enabled) {
    const ageMinutes = (Date.now() - info.accountCreatedAt.getTime()) / 60_000;
    const looksRandomlyGenerated = /^[a-z]+\d{4,}$/i.test(info.username);
    if (!info.hasAvatar && (ageMinutes < 60 || looksRandomlyGenerated)) {
      triggers.push({ filter: "suspiciousAccount", action: config.suspiciousAccount.action });
    }
  }

  if (!info.isBot && config.nicknameBlacklist?.enabled) {
    const matches = config.nicknameBlacklist.patterns.some((p) => wildcardToRegExp(p).test(info.username));
    if (matches) triggers.push({ filter: "nicknameBlacklist", action: config.nicknameBlacklist.action });
  }

  return triggers;
}

/** Nickname re-check used on post-join nickname changes — only the blacklist filter applies there. */
export function evaluateNicknameBlacklist(config: JoinGateConfig, nickname: string): JoinGateTrigger | null {
  if (!config.nicknameBlacklist?.enabled) return null;
  const matches = config.nicknameBlacklist.patterns.some((p) => wildcardToRegExp(p).test(nickname));
  return matches ? { filter: "nicknameBlacklist", action: config.nicknameBlacklist.action } : null;
}

export function pickStrictestAction(triggers: JoinGateTrigger[]): JoinGateTrigger | null {
  if (triggers.length === 0) return null;
  return triggers.reduce((strictest, t) => (ACTION_SEVERITY[t.action] > ACTION_SEVERITY[strictest.action] ? t : strictest));
}
