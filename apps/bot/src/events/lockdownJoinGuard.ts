import { Events, type GuildMember } from "discord.js";
import { getLockdownState, writeAuditLog } from "@discord-rp/core";
import type { BotClient } from "../client.js";

/** Independent from join-gate/join-raid (M24/M25) — a full-server lockdown's own auto-kick/ban toggle, applied regardless of any other filter's verdict. */
export function registerLockdownJoinGuardEvent(client: BotClient) {
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    try {
      const state = await getLockdownState(member.guild.id);
      if (!state.active || (!state.autoKickNewMembers && !state.autoBanNewMembers)) return;

      await writeAuditLog({
        guildId: member.guild.id,
        actorType: "SYSTEM",
        action: "lockdown.new_member_blocked",
        targetType: "DiscordMember",
        targetId: member.id,
        metadata: { action: state.autoBanNewMembers ? "BAN" : "KICK" },
      });

      if (state.autoBanNewMembers) {
        await member.ban({ reason: "Lockdown actif : arrivées bloquées" }).catch(() => {});
      } else if (state.autoKickNewMembers) {
        await member.kick("Lockdown actif : arrivées bloquées").catch(() => {});
      }
    } catch (err) {
      console.error("[lockdown] join guard failed:", err);
    }
  });
}
