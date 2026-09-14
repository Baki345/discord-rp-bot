import type { ChatInputCommandInteraction, UserContextMenuCommandInteraction } from "discord.js";

/**
 * /mod is only visible to members with ModerateMembers (the command's
 * default member permissions), but ban/kick/purge/nickname edits each need
 * their own specific Discord permission — checked here so a timeout-only
 * moderator gets a clear refusal instead of a raw Discord API error.
 */
export function hasDiscordPermission(
  interaction: ChatInputCommandInteraction | UserContextMenuCommandInteraction,
  bit: bigint,
): boolean {
  return interaction.memberPermissions?.has(bit) ?? false;
}
