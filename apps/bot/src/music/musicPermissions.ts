import { PermissionFlagsBits, type ButtonInteraction, type ChatInputCommandInteraction } from "discord.js";
import { canControlMusic, type MusicConfig } from "@discord-rp/core";

/** Shared between the /musique subcommands and the now-playing message's buttons — same DJ-role-or-admin gate either way. */
export function actorCanControlMusic(interaction: ChatInputCommandInteraction | ButtonInteraction, config: MusicConfig): boolean {
  const isAdmin =
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
    false;
  const roleIds = Array.isArray(interaction.member?.roles)
    ? interaction.member.roles
    : interaction.member?.roles.cache.map((r) => r.id) ?? [];
  return canControlMusic(config, roleIds, isAdmin);
}
