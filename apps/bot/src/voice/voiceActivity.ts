/** In-memory last-activity timestamps per "guildId:discordUserId" currently in a voice channel — reset on any voice state change (join/move/mute/deafen). */
const lastActivity = new Map<string, number>();

function key(guildId: string, discordUserId: string): string {
  return `${guildId}:${discordUserId}`;
}

export function recordVoiceActivity(guildId: string, discordUserId: string): void {
  lastActivity.set(key(guildId, discordUserId), Date.now());
}

export function getLastVoiceActivity(guildId: string, discordUserId: string): number | undefined {
  return lastActivity.get(key(guildId, discordUserId));
}

export function clearVoiceActivity(guildId: string, discordUserId: string): void {
  lastActivity.delete(key(guildId, discordUserId));
}
