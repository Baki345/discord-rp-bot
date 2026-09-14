import type { HeatState } from "@discord-rp/core";

/**
 * In-memory heat + panic/mention-flood tracking — same shape as every
 * other in-memory tracker in this codebase (exam sessions, join-raid
 * history): ephemeral, keyed per guild or per "guildId:discordUserId",
 * never persisted. A bot restart just means every member's heat resets
 * to 0, which is an acceptable tradeoff for not writing to Postgres on
 * every single message.
 */
const heatByMember = new Map<string, HeatState>();

export function heatKey(guildId: string, discordUserId: string): string {
  return `${guildId}:${discordUserId}`;
}

export function getHeatState(key: string): HeatState {
  return heatByMember.get(key) ?? { heat: 0, lastUpdateAtMs: Date.now(), strikes: 0 };
}

export function setHeatState(key: string, state: HeatState): void {
  heatByMember.set(key, state);
}

// --- panic sub-mode: recent strikes per guild, and which members are currently "flagged" ---

interface GuildPanicState {
  strikeTimestampsMs: number[];
  flaggedUntilMsByMember: Map<string, number>;
}

const panicByGuild = new Map<string, GuildPanicState>();

function getPanicState(guildId: string): GuildPanicState {
  let state = panicByGuild.get(guildId);
  if (!state) {
    state = { strikeTimestampsMs: [], flaggedUntilMsByMember: new Map() };
    panicByGuild.set(guildId, state);
  }
  return state;
}

export function recordStrike(guildId: string, discordUserId: string, nowMs: number, flaggedForMs: number): void {
  const state = getPanicState(guildId);
  state.strikeTimestampsMs = state.strikeTimestampsMs.filter((t) => nowMs - t < 10 * 60_000).concat(nowMs);
  state.flaggedUntilMsByMember.set(discordUserId, nowMs + flaggedForMs);
}

export function getRecentStrikeTimestamps(guildId: string, nowMs: number): number[] {
  return getPanicState(guildId).strikeTimestampsMs.filter((t) => nowMs - t < 10 * 60_000);
}

export function isMemberFlagged(guildId: string, discordUserId: string, nowMs: number): boolean {
  const until = getPanicState(guildId).flaggedUntilMsByMember.get(discordUserId);
  return until !== undefined && until > nowMs;
}

// --- mention-flood tracking per guild ---

interface GuildMentionState {
  timestampsMs: number[];
  lastLockdownAtMs?: number;
}

const mentionsByGuild = new Map<string, GuildMentionState>();

export function recordMentions(guildId: string, count: number, nowMs: number): void {
  if (count <= 0) return;
  let state = mentionsByGuild.get(guildId);
  if (!state) {
    state = { timestampsMs: [] };
    mentionsByGuild.set(guildId, state);
  }
  state.timestampsMs = state.timestampsMs.filter((t) => nowMs - t < 5 * 60_000).concat(Array(count).fill(nowMs));
}

export function getRecentMentionTimestamps(guildId: string, nowMs: number): number[] {
  return (mentionsByGuild.get(guildId)?.timestampsMs ?? []).filter((t) => nowMs - t < 5 * 60_000);
}

/** Guards against re-triggering the mention-flood lockdown every message while the flood is ongoing. */
export function canTriggerMentionFloodLockdown(guildId: string, nowMs: number, cooldownMs: number): boolean {
  const state = mentionsByGuild.get(guildId);
  if (!state?.lastLockdownAtMs) return true;
  return nowMs - state.lastLockdownAtMs >= cooldownMs;
}

export function markMentionFloodLockdownTriggered(guildId: string, nowMs: number): void {
  const state = mentionsByGuild.get(guildId);
  if (state) state.lastLockdownAtMs = nowMs;
}
