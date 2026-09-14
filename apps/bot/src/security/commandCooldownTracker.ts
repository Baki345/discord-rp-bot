// In-memory only, resets on bot restart — same convention as every other
// cooldown/activity tracker in this project (messageActivity.ts, etc.).
const lastInvokedAtMs = new Map<string, number>();

function key(guildId: string, commandName: string, discordUserId: string): string {
  return `${guildId}:${commandName}:${discordUserId}`;
}

export function getLastInvokedAt(guildId: string, commandName: string, discordUserId: string): Date | null {
  const ms = lastInvokedAtMs.get(key(guildId, commandName, discordUserId));
  return ms === undefined ? null : new Date(ms);
}

export function recordInvocation(guildId: string, commandName: string, discordUserId: string, nowMs: number): void {
  lastInvokedAtMs.set(key(guildId, commandName, discordUserId), nowMs);
}
