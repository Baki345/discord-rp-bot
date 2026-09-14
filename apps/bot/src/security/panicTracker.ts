import type { ActorBreachEvent } from "@discord-rp/core";

/** In-memory per-guild list of recent anti-nuke threshold breaches, fed by auditLogEntryCreate.ts — panic.service's checkPanicTrigger reads this to decide whether a wave (multiple distinct actors) is underway. */
const breachesByGuild = new Map<string, ActorBreachEvent[]>();
const MAX_AGE_MS = 30 * 60_000;

export function recordBreach(guildId: string, actorId: string, nowMs: number): ActorBreachEvent[] {
  const list = (breachesByGuild.get(guildId) ?? []).filter((b) => nowMs - b.atMs < MAX_AGE_MS);
  list.push({ actorId, atMs: nowMs });
  breachesByGuild.set(guildId, list);
  return list;
}

export function getRecentBreaches(guildId: string, nowMs: number): ActorBreachEvent[] {
  return (breachesByGuild.get(guildId) ?? []).filter((b) => nowMs - b.atMs < MAX_AGE_MS);
}

export function clearBreaches(guildId: string): void {
  breachesByGuild.delete(guildId);
}
