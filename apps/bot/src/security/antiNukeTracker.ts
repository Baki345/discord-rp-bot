/**
 * In-memory per-actor rolling timestamp history — same shape as every
 * other in-memory tracker in this codebase. Keyed by "guildId:actorId".
 * A bot restart resets everyone's count to 0, which is an acceptable
 * tradeoff (matches M25's join-raid tracker reasoning).
 */
const timestampsByActor = new Map<string, number[]>();
const MAX_TRACKED_AGE_MS = 60 * 60_000;

function key(guildId: string, actorId: string): string {
  return `${guildId}:${actorId}`;
}

export function recordAction(guildId: string, actorId: string, nowMs: number): number[] {
  const k = key(guildId, actorId);
  const list = (timestampsByActor.get(k) ?? []).filter((t) => nowMs - t < MAX_TRACKED_AGE_MS);
  list.push(nowMs);
  timestampsByActor.set(k, list);
  return list;
}

export function clearActor(guildId: string, actorId: string): void {
  timestampsByActor.delete(key(guildId, actorId));
}
