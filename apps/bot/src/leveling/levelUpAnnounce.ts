import type { Guild } from "discord.js";
import type { LevelingConfig, XpGainResult } from "@discord-rp/core";

function formatAnnounceMessage(template: string, discordUserId: string, level: number): string {
  return template.replaceAll("{membre}", `<@${discordUserId}>`).replaceAll("{niveau}", String(level));
}

/**
 * Shared by the text and voice XP hooks: grants any reward role configured
 * for the level just reached, and announces the level-up if enabled.
 * `fallbackChannelId` is the channel the triggering message was sent in
 * (text XP only) — voice XP has no such channel, so a voice-triggered
 * level-up only announces when config.announceChannelId is explicitly set.
 */
export async function applyLevelUpEffects(
  guild: Guild,
  discordUserId: string,
  result: XpGainResult,
  config: LevelingConfig,
  fallbackChannelId: string | null = null,
): Promise<void> {
  if (!result.leveledUp) return;

  if (result.rewardRoleId) {
    const member = await guild.members.fetch(discordUserId).catch(() => null);
    if (member && !member.roles.cache.has(result.rewardRoleId)) {
      await member.roles.add(result.rewardRoleId, `Niveau ${result.level} atteint`).catch(() => {});
    }
  }

  if (!config.announceLevelUp) return;
  const channelId = config.announceChannelId ?? fallbackChannelId;
  if (!channelId) return;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isSendable()) return;
  await channel.send(formatAnnounceMessage(config.announceMessage, discordUserId, result.level)).catch(() => {});
}
