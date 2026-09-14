import type { JoinRaidMemberInfo } from "@discord-rp/core";

/**
 * In-memory rolling join history per guild — same shape as the in-memory
 * trackers used since M11 (exam sessions, voice activity, anti-AFK): keyed
 * by guildId, pruned on read, never persisted (a bot restart just means a
 * cold detector for a few minutes, which is an acceptable tradeoff for
 * avoiding a DB write on every single join).
 */
const recentJoinsByGuild = new Map<string, JoinRaidMemberInfo[]>();
/** guildId -> timestamp (ms) until which every new joiner is treated as part of an active raid. */
const raidActiveUntil = new Map<string, number>();

const MAX_TRACKED_JOINS_PER_GUILD = 200;
const MAX_TRACKED_AGE_MS = 60 * 60 * 1000; // never keep more than an hour of history regardless of config

export function recordJoin(guildId: string, info: JoinRaidMemberInfo): void {
  const list = recentJoinsByGuild.get(guildId) ?? [];
  list.push(info);

  const cutoff = Date.now() - MAX_TRACKED_AGE_MS;
  const pruned = list.filter((m) => m.joinedAt.getTime() >= cutoff).slice(-MAX_TRACKED_JOINS_PER_GUILD);
  recentJoinsByGuild.set(guildId, pruned);
}

export function getRecentJoins(guildId: string): JoinRaidMemberInfo[] {
  return recentJoinsByGuild.get(guildId) ?? [];
}

export function markRaidActiveUntil(guildId: string, until: Date): void {
  raidActiveUntil.set(guildId, until.getTime());
}

export function isRaidActive(guildId: string): boolean {
  const until = raidActiveUntil.get(guildId);
  return until !== undefined && until > Date.now();
}
