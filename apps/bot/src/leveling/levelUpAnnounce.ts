import type { Guild } from "discord.js";
import type { XpGainResult } from "@discord-rp/core";

/** Shared by the text and voice XP hooks: grants any reward role configured for the level just reached. */
export async function applyLevelUpEffects(guild: Guild, discordUserId: string, result: XpGainResult): Promise<void> {
  if (!result.leveledUp || !result.rewardRoleId) return;

  const member = await guild.members.fetch(discordUserId).catch(() => null);
  if (member && !member.roles.cache.has(result.rewardRoleId)) {
    await member.roles.add(result.rewardRoleId, `Niveau ${result.level} atteint`).catch(() => {});
  }
}
