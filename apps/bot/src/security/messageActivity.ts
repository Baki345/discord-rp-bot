const LOW_ACTIVITY_WINDOW_MS = 60 * 60_000;
const LOW_ACTIVITY_THRESHOLD = 5; // fewer than this many messages in the last hour counts as "low activity"

const channelTimestampsMs = new Map<string, number[]>();

export function recordChannelMessage(channelId: string, nowMs: number): void {
  const list = (channelTimestampsMs.get(channelId) ?? []).filter((t) => nowMs - t < LOW_ACTIVITY_WINDOW_MS);
  list.push(nowMs);
  channelTimestampsMs.set(channelId, list.slice(-50));
}

export function isLowActivityChannel(channelId: string, nowMs: number): boolean {
  const list = (channelTimestampsMs.get(channelId) ?? []).filter((t) => nowMs - t < LOW_ACTIVITY_WINDOW_MS);
  return list.length < LOW_ACTIVITY_THRESHOLD;
}

// --- per-member last message, for the "repeated/similar message" heat factor ---

const lastMessageByMember = new Map<string, string>();

function normalize(content: string): string {
  return content.trim().toLowerCase().slice(0, 100);
}

/** Approximate repeat detection: same (normalized, truncated) content as this member's immediately preceding message. */
export function isRepeatOfLastMessage(key: string, content: string): boolean {
  const normalized = normalize(content);
  const previous = lastMessageByMember.get(key);
  lastMessageByMember.set(key, normalized);
  return normalized.length > 0 && normalized === previous;
}
