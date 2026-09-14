import { PermissionFlagsBits, type PermissionsBitField } from "discord.js";
import type { ActorContext } from "@discord-rp/core";

/** Structural type covering every interaction kind (chat-input, button, modal submit) that carries these three properties. */
export interface ActorResolvableInteraction {
  guildId: string | null;
  user: { id: string };
  memberPermissions: PermissionsBitField | null;
  inGuild(): boolean;
}

/**
 * Builds the ActorContext every packages/core service expects, from a
 * discord.js interaction (chat-input, button, or modal submit — anything
 * carrying guildId/user/memberPermissions). `rpPermissions` is always
 * empty for now — the real GuildMemberRPRole lookup (plus Discord-role-
 * mapped RPRoles) lands in M9; until then, only Discord guild admins can
 * pass a requirePermission() check via the isDiscordGuildAdmin escape hatch.
 */
export async function resolveActorContext(interaction: ActorResolvableInteraction): Promise<ActorContext> {
  if (!interaction.inGuild() || !interaction.guildId) {
    throw new Error("This command can only be used inside a server.");
  }

  const isDiscordGuildAdmin =
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
    false;

  return {
    guildId: interaction.guildId,
    discordUserId: interaction.user.id,
    source: "discord-bot",
    isDiscordGuildAdmin,
    rpPermissions: [],
  };
}
