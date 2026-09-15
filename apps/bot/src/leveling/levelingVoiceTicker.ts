import { prisma } from "@discord-rp/database";
import { LevelingConfig, addVoiceXp } from "@discord-rp/core";
import type { BotClient } from "../client.js";
import { applyLevelUpEffects } from "./levelUpAnnounce.js";

const TICK_INTERVAL_MS = 60 * 1000;

/** Every minute, awards voice XP to every non-bot member currently in a voice channel — excludes the guild's AFK channel (if configured) so parked members don't farm XP. */
export function startLevelingVoiceTicker(client: BotClient) {
  const tick = async () => {
    try {
      const configs = await prisma.guildConfig.findMany();
      for (const row of configs) {
        const config = LevelingConfig.parse(row.levelingConfig ?? {});
        if (!config.enabled) continue;

        const guild = client.guilds.cache.get(row.guildId);
        if (!guild) continue;

        for (const voiceState of guild.voiceStates.cache.values()) {
          if (!voiceState.channelId || voiceState.channelId === row.afkChannelId) continue;
          if (voiceState.member?.user.bot) continue;

          const result = await addVoiceXp(row.guildId, voiceState.id, config, new Date());
          if (result?.leveledUp) await applyLevelUpEffects(guild, voiceState.id, result, config);
        }
      }
    } catch (err) {
      console.error("[leveling-voice-ticker] tick failed:", err);
    }
  };
  setInterval(tick, TICK_INTERVAL_MS);
}
