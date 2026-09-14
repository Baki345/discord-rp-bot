import { Events, type GuildMember, type PartialGuildMember } from "discord.js";
import { getJoinGateConfig, evaluateNicknameBlacklist, writeAuditLog } from "@discord-rp/core";
import type { BotClient } from "../client.js";

const FIXED_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

/** Re-checks the nickname blacklist filter whenever a member's display name changes after joining — a raider can join clean and rename afterward. */
export function registerGuildMemberUpdateJoinGateEvent(client: BotClient) {
  client.on(Events.GuildMemberUpdate, async (oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) => {
    if (!oldMember.partial && oldMember.displayName === newMember.displayName) return;
    try {
      const config = await getJoinGateConfig(newMember.guild.id);
      const trigger = evaluateNicknameBlacklist(config, newMember.displayName);
      if (!trigger) return;

      await writeAuditLog({
        guildId: newMember.guild.id,
        actorType: "SYSTEM",
        action: `joingate.${trigger.filter}`,
        targetType: "DiscordMember",
        targetId: newMember.id,
        metadata: { nickname: newMember.displayName, action: trigger.action, postJoin: true },
      });

      const reason = `Porte d'entrée (pseudo post-arrivée) : ${trigger.filter}`;
      switch (trigger.action) {
        case "LOG":
          break;
        case "TIMEOUT":
          await newMember.timeout(FIXED_TIMEOUT_MS, reason);
          break;
        case "KICK":
          await newMember.kick(reason);
          break;
        case "BAN":
          await newMember.ban({ reason });
          break;
      }
    } catch (err) {
      console.error("[join-gate] post-join nickname re-check failed:", err);
    }
  });
}
