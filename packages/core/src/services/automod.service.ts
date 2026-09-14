import { z } from "zod";
import { prisma, type Prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";

export const AutomodConfig = z.object({
  enabled: z.boolean().default(false),
  maxHeat: z.number().min(1).default(100),
  decayPerSecond: z.number().min(0).default(1),
  strikesBeforeCap: z.number().int().min(1).default(3),
  normalTimeoutMinutes: z.number().int().min(1).default(10),
  capTimeoutMinutes: z.number().int().min(1).default(240),
  /** Multiplies the next timeout's duration when a member re-offends within recidivismWindowMinutes of their last timeout. */
  recidivismMultiplier: z.number().min(1).default(2),
  recidivismWindowMinutes: z.number().int().min(1).default(60),
  resetHeatOnTimeout: z.boolean().default(true),
  panicOffendersThreshold: z.number().int().min(1).default(5),
  panicWindowSeconds: z.number().int().min(5).default(60),
  mentionFloodMaxPerWindow: z.number().int().min(1).default(20),
  mentionFloodWindowSeconds: z.number().int().min(5).default(30),
  wordBlacklist: z.array(z.string()).default([]),
  domainBlacklist: z.array(z.string()).default([]),
});
export type AutomodConfig = z.infer<typeof AutomodConfig>;

export async function getAutomodConfig(guildId: string): Promise<AutomodConfig> {
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  const parsed = AutomodConfig.safeParse(config?.automodConfig ?? {});
  return parsed.success ? parsed.data : AutomodConfig.parse({});
}

export async function setAutomodConfig(actor: ActorContext, input: { guildId: string; config: Partial<AutomodConfig> }) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");

  const current = await getAutomodConfig(input.guildId);
  const next = AutomodConfig.parse({ ...current, ...input.config });

  await prisma.guildConfig.update({ where: { guildId: input.guildId }, data: { automodConfig: next as Prisma.InputJsonValue } });

  await writeAuditLog({
    guildId: input.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "automod.set_config",
    targetType: "GuildConfig",
    metadata: { config: next },
  });

  return next;
}

export async function listGuildsWithAutomodEnabled(): Promise<string[]> {
  const configs = await prisma.guildConfig.findMany({
    where: { automodConfig: { path: ["enabled"], equals: true } },
    select: { guildId: true },
  });
  return configs.map((c) => c.guildId);
}

// ============================= SCORING (pure) =============================

export interface MessageFeatures {
  charCount: number;
  newlineCount: number;
  emojiCount: number;
  mentionEveryone: boolean;
  roleMentionCount: number;
  userMentionCount: number;
  attachmentCount: number;
  isRepeatOfRecent: boolean;
  matchedBlacklistedWord: boolean;
  matchedBlacklistedDomain: boolean;
  hasAnyLink: boolean;
  isWebhook: boolean;
  isLowActivityChannel: boolean;
  isForumPost: boolean;
}

/**
 * Weights are deliberately internal (not exposed as guild config) — the
 * spec itself calls out "facteurs internes non publics" as one of the
 * scoring inputs, so keeping the exact per-factor weights out of admin
 * hands is expected behavior, not a missing feature.
 */
function baseScore(features: MessageFeatures): number {
  let score = 1; // every message costs something

  if (features.isRepeatOfRecent) score += 12;
  if (features.hasAnyLink) score += 6;
  if (features.matchedBlacklistedDomain) score += 15;
  if (features.matchedBlacklistedWord) score += 10;
  if (features.mentionEveryone) score += 15;
  score += features.roleMentionCount * 8;
  score += features.userMentionCount * 1;
  score += features.attachmentCount * 2;
  score += Math.max(0, features.emojiCount - 5) * 0.5;
  score += Math.max(0, features.charCount - 200) * 0.02;
  score += Math.max(0, features.newlineCount - 3) * 1;
  if (features.isLowActivityChannel) score += 5;
  if (features.isForumPost) score += 2;

  return score;
}

/** Pure — no I/O. Webhook messages are scored more severely (multiplier), per spec ("webhooks traités plus sévèrement"). */
export function scoreMessage(features: MessageFeatures): number {
  const score = baseScore(features);
  return features.isWebhook ? score * 1.5 : score;
}

export function applyDecay(heat: number, secondsElapsed: number, decayPerSecond: number): number {
  return Math.max(0, heat - secondsElapsed * decayPerSecond);
}

export interface HeatState {
  heat: number;
  lastUpdateAtMs: number;
  strikes: number;
  lastTimeoutAtMs?: number;
}

export interface ProcessMessageResult {
  newState: HeatState;
  shouldTimeout: boolean;
  timeoutMinutes: number;
  isCapTimeout: boolean;
}

/**
 * The whole heat state machine in one pure function: decay since last
 * update, add this message's score, and decide whether the member just
 * crossed the threshold. Strikes accumulate across the member's lifetime
 * (they only reset if resetHeatOnTimeout also resets heat — strikes
 * themselves never reset, so repeated offenders keep escalating toward
 * the cap timeout even across separate heat-decay cycles).
 */
export function processMessage(config: AutomodConfig, state: HeatState, features: MessageFeatures, nowMs: number): ProcessMessageResult {
  const secondsElapsed = Math.max(0, (nowMs - state.lastUpdateAtMs) / 1000);
  const decayed = applyDecay(state.heat, secondsElapsed, config.decayPerSecond);
  const newHeat = decayed + scoreMessage(features);

  if (newHeat < config.maxHeat) {
    return { newState: { ...state, heat: newHeat, lastUpdateAtMs: nowMs }, shouldTimeout: false, timeoutMinutes: 0, isCapTimeout: false };
  }

  const strikes = state.strikes + 1;
  const isCapTimeout = strikes > config.strikesBeforeCap;
  let timeoutMinutes = isCapTimeout ? config.capTimeoutMinutes : config.normalTimeoutMinutes;

  const recentlyTimedOut =
    state.lastTimeoutAtMs !== undefined && nowMs - state.lastTimeoutAtMs < config.recidivismWindowMinutes * 60_000;
  if (recentlyTimedOut) timeoutMinutes = Math.round(timeoutMinutes * config.recidivismMultiplier);

  const newState: HeatState = {
    heat: config.resetHeatOnTimeout ? 0 : newHeat,
    lastUpdateAtMs: nowMs,
    strikes,
    lastTimeoutAtMs: nowMs,
  };

  return { newState, shouldTimeout: true, timeoutMinutes, isCapTimeout };
}

/** Panic sub-mode: enough distinct offenders striking within the window means every subsequent message from a flagged member is instant-timed-out, bypassing the normal heat curve. */
export function isPanicActive(recentStrikeTimestampsMs: number[], config: AutomodConfig, nowMs: number): boolean {
  const windowStart = nowMs - config.panicWindowSeconds * 1000;
  const distinctRecentCount = recentStrikeTimestampsMs.filter((t) => t >= windowStart).length;
  return distinctRecentCount >= config.panicOffendersThreshold;
}

/** Anti ping-raid: too many mentions guild-wide in a short window signals a mention-flood attack. */
export function isMentionFloodTriggered(recentMentionTimestampsMs: number[], config: AutomodConfig, nowMs: number): boolean {
  const windowStart = nowMs - config.mentionFloodWindowSeconds * 1000;
  const count = recentMentionTimestampsMs.filter((t) => t >= windowStart).length;
  return count >= config.mentionFloodMaxPerWindow;
}
