import { getVerificationConfig, listGuildsWithVerificationEnabled, hasVerificationExpired, writeAuditLog } from "@discord-rp/core";
import type { BotClient } from "../client.js";
import { applyFailAction } from "./actions.js";

const TICK_INTERVAL_MS = 2 * 60_000;

/** Applies the configured fail action to members who never verified within their grace period — relies on the Server Members Intent's member cache, same requirement as join-gate/join-raid. */
export function startVerificationTimeoutTicker(client: BotClient) {
  const tick = async () => {
    try {
      await sweep(client);
    } catch (err) {
      console.error("[verification-timeout] tick failed:", err);
    }
  };
  void tick();
  setInterval(tick, TICK_INTERVAL_MS);
}

async function sweep(client: BotClient) {
  const guildIds = await listGuildsWithVerificationEnabled();
  for (const guildId of guildIds) {
    const config = await getVerificationConfig(guildId);
    if (!config.enabled || !config.verifiedRoleId || config.failAction === "NONE") continue;

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) continue;

    const now = new Date();
    for (const member of guild.members.cache.values()) {
      if (member.user.bot) continue;
      if (member.roles.cache.has(config.verifiedRoleId)) continue;
      if (!member.joinedAt || !hasVerificationExpired(member.joinedAt, config.timeoutMinutes, now)) continue;

      await writeAuditLog({
        guildId,
        actorType: "SYSTEM",
        action: "verification.timeout",
        targetType: "DiscordMember",
        targetId: member.id,
        metadata: { failAction: config.failAction },
      });
      await applyFailAction(member, config.failAction, "Délai de vérification dépassé");
    }
  }
}
