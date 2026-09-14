import { prisma } from "@discord-rp/database";
import type { BotClient } from "../client.js";
import { getLastVoiceActivity, recordVoiceActivity, clearVoiceActivity } from "./voiceActivity.js";

const TICK_INTERVAL_MS = 2 * 60 * 1000;

/** Every 2 minutes, moves members idle (no voice state change) past afkTimeoutMinutes into the guild's configured AFK channel. */
export function startAfkTicker(client: BotClient) {
  const tick = async () => {
    try {
      const configs = await prisma.guildConfig.findMany({ where: { afkChannelId: { not: null } } });
      for (const config of configs) {
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) continue;

        const timeoutMs = config.afkTimeoutMinutes * 60_000;
        for (const voiceState of guild.voiceStates.cache.values()) {
          if (!voiceState.channelId || voiceState.channelId === config.afkChannelId) continue;
          if (voiceState.member?.user.bot) continue;

          const discordUserId = voiceState.id;
          const last = getLastVoiceActivity(config.guildId, discordUserId);
          if (last === undefined) {
            // First time seen (e.g. bot just restarted) — start the clock now instead of assuming infinite idle.
            recordVoiceActivity(config.guildId, discordUserId);
            continue;
          }

          if (Date.now() - last > timeoutMs) {
            try {
              await voiceState.setChannel(config.afkChannelId!, "Anti-AFK: inactif trop longtemps");
              clearVoiceActivity(config.guildId, discordUserId);
            } catch (err) {
              console.error(`[afk-ticker] failed to move ${discordUserId} in guild ${config.guildId}:`, err);
            }
          }
        }
      }
    } catch (err) {
      console.error("[afk-ticker] tick failed:", err);
    }
  };
  setInterval(tick, TICK_INTERVAL_MS);
}
