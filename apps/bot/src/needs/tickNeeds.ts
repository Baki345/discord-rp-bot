import { prisma } from "@discord-rp/database";
import { tickNeedsForGuild } from "@discord-rp/core";

const TICK_INTERVAL_MS = 30 * 60 * 1000;

/** Decays hunger/thirst every 30 minutes for every guild that has the feature enabled — tickNeedsForGuild itself is a no-op for guilds that don't. */
export function startNeedsTicker() {
  const tick = async () => {
    try {
      const guilds = await prisma.guildConfig.findMany({ where: { hungerThirstEnabled: true }, select: { guildId: true } });
      for (const { guildId } of guilds) {
        await tickNeedsForGuild(guildId);
      }
    } catch (err) {
      console.error("[needs-ticker] tick failed:", err);
    }
  };
  setInterval(tick, TICK_INTERVAL_MS);
}
