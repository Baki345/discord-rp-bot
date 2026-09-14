import type { GuildMember } from "discord.js";
import type { VerificationConfig } from "@discord-rp/core";

export async function grantVerifiedRole(member: GuildMember, roleId: string): Promise<boolean> {
  try {
    await member.roles.add(roleId, "Vérification réussie");
    return true;
  } catch (err) {
    console.error(`[verification] failed to grant role to ${member.id}:`, err);
    return false;
  }
}

export async function applyFailAction(member: GuildMember, action: VerificationConfig["failAction"], reason: string): Promise<void> {
  try {
    if (action === "KICK") await member.kick(reason);
    if (action === "BAN") await member.ban({ reason });
  } catch (err) {
    console.error(`[verification] failed to apply fail action ${action} to ${member.id}:`, err);
  }
}
