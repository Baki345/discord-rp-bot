import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";

const RewardRole = z.object({ level: z.number().int().min(1), roleId: z.string() });

export const LevelingConfig = z.object({
  enabled: z.boolean().default(false),
  xpPerMessage: z.number().int().min(1).default(15),
  xpPerVoiceMinute: z.number().int().min(1).default(10),
  cooldownSeconds: z.number().int().min(0).default(60),
  curveMultiplier: z.number().min(0.1).default(1),
  rewardRoles: z.array(RewardRole).default([]),
  /** Falls back for any member who hasn't set their own MemberLevel.cardBackgroundUrl. */
  defaultCardBackgroundUrl: z.string().nullable().default(null),
});
export type LevelingConfig = z.infer<typeof LevelingConfig>;

export async function getLevelingConfig(guildId: string): Promise<LevelingConfig> {
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  return LevelingConfig.parse(config?.levelingConfig ?? {});
}

export async function setLevelingConfig(actor: ActorContext, guildId: string, input: Partial<z.input<typeof LevelingConfig>>) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");
  const current = await getLevelingConfig(guildId);
  const merged = LevelingConfig.parse({ ...current, ...input });

  return prisma.guildConfig.update({ where: { guildId }, data: { levelingConfig: merged as never } });
}

/** XP required to go from `level` to `level + 1` — an increment, not a cumulative total. Pure: no I/O, no clock. */
export function xpForLevel(level: number, curveMultiplier = 1): number {
  return Math.round(curveMultiplier * (5 * level * level + 50 * level + 100));
}

/** Walks up levels from 0, subtracting each level's increment, until totalXp can't cover the next one. Pure. */
export function levelForXp(totalXp: number, curveMultiplier = 1): number {
  let level = 0;
  let remaining = totalXp;
  while (remaining >= xpForLevel(level, curveMultiplier)) {
    remaining -= xpForLevel(level, curveMultiplier);
    level++;
  }
  return level;
}

/** XP already earned toward the current level, and how much more is needed to reach the next one — for progress-bar/display purposes. Pure. */
export function xpProgressWithinLevel(totalXp: number, curveMultiplier = 1): { currentLevelXp: number; neededForNextLevel: number } {
  let level = 0;
  let remaining = totalXp;
  while (remaining >= xpForLevel(level, curveMultiplier)) {
    remaining -= xpForLevel(level, curveMultiplier);
    level++;
  }
  return { currentLevelXp: remaining, neededForNextLevel: xpForLevel(level, curveMultiplier) };
}

function findRewardRole(config: LevelingConfig, level: number): string | undefined {
  return config.rewardRoles.find((r) => r.level === level)?.roleId;
}

export interface XpGainResult {
  xp: number;
  level: number;
  leveledUp: boolean;
  rewardRoleId?: string;
}

async function grantXp(guildId: string, discordUserId: string, amount: number, config: LevelingConfig, field: "lastTextXpAt" | "lastVoiceTickAt", now: Date): Promise<XpGainResult> {
  const existing = await prisma.memberLevel.upsert({
    where: { guildId_discordUserId: { guildId, discordUserId } },
    update: {},
    create: { guildId, discordUserId },
  });

  const newXp = existing.xp + amount;
  const previousLevel = existing.level;
  const newLevel = levelForXp(newXp, config.curveMultiplier);

  await prisma.memberLevel.update({
    where: { guildId_discordUserId: { guildId, discordUserId } },
    data: { xp: newXp, level: newLevel, [field]: now },
  });

  const leveledUp = newLevel > previousLevel;
  return { xp: newXp, level: newLevel, leveledUp, rewardRoleId: leveledUp ? findRewardRole(config, newLevel) : undefined };
}

/**
 * `now` is always passed in rather than read internally — same
 * discipline as every other threshold/cooldown function in this
 * project, so message-XP behavior is deterministically testable
 * without a live clock. Returns null when the cooldown blocks the gain
 * (no DB write happens in that case).
 */
export async function addTextXp(guildId: string, discordUserId: string, config: LevelingConfig, now: Date): Promise<XpGainResult | null> {
  if (!config.enabled) return null;

  const existing = await prisma.memberLevel.findUnique({ where: { guildId_discordUserId: { guildId, discordUserId } } });
  if (existing?.lastTextXpAt) {
    const elapsedMs = now.getTime() - existing.lastTextXpAt.getTime();
    if (elapsedMs < config.cooldownSeconds * 1000) return null;
  }

  return grantXp(guildId, discordUserId, config.xpPerMessage, config, "lastTextXpAt", now);
}

/** No cooldown for voice — called once per tick (minute) by the bot's voice ticker, so the tick interval itself is the natural rate limit. */
export async function addVoiceXp(guildId: string, discordUserId: string, config: LevelingConfig, now: Date): Promise<XpGainResult | null> {
  if (!config.enabled) return null;
  return grantXp(guildId, discordUserId, config.xpPerVoiceMinute, config, "lastVoiceTickAt", now);
}

export async function getMemberLevel(guildId: string, discordUserId: string) {
  return prisma.memberLevel.findUnique({ where: { guildId_discordUserId: { guildId, discordUserId } } });
}

export async function listLeaderboard(guildId: string, limit = 10) {
  return prisma.memberLevel.findMany({ where: { guildId }, orderBy: { xp: "desc" }, take: limit });
}

export async function setMemberCardBackground(discordUserId: string, guildId: string, backgroundUrl: string | null) {
  await prisma.memberLevel.upsert({
    where: { guildId_discordUserId: { guildId, discordUserId } },
    update: { cardBackgroundUrl: backgroundUrl },
    create: { guildId, discordUserId, cardBackgroundUrl: backgroundUrl },
  });
}
