import { ApplicationCommandType, ContextMenuCommandBuilder, PermissionFlagsBits, type UserContextMenuCommandInteraction } from "discord.js";
import { recordBan, recordKick, recordTimeout } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";
import type { ContextMenuCommand } from "../../client.js";
import { hasDiscordPermission } from "./permissions.js";

/**
 * Right-click "Apps" equivalents of /mod ban|kick|timeout — quick actions
 * with a fixed reason and no extra prompts. For a custom reason, duration,
 * or purge window, moderators use the slash command instead.
 */
const DEFAULT_TIMEOUT_MINUTES = 10;
const CONTEXT_MENU_REASON = "Action rapide via menu contextuel";

export const banContextMenu: ContextMenuCommand = {
  data: new ContextMenuCommandBuilder()
    .setName("Bannir")
    .setType(ApplicationCommandType.User)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction: UserContextMenuCommandInteraction) {
    if (!hasDiscordPermission(interaction, PermissionFlagsBits.BanMembers)) {
      await interaction.reply({ content: "❌ Il te faut la permission Discord **Bannir des membres**.", ephemeral: true });
      return;
    }
    const target = interaction.targetUser;
    try {
      await interaction.guild!.members.ban(target.id, { reason: CONTEXT_MENU_REASON });
    } catch {
      await interaction.reply({ content: "❌ Impossible de bannir ce compte.", ephemeral: true });
      return;
    }
    const actor = await resolveActorContext(interaction);
    await recordBan(actor, { guildId: actor.guildId, targetDiscordId: target.id, reason: CONTEXT_MENU_REASON });
    await interaction.reply({ content: `🔨 **${target.tag}** a été banni.`, ephemeral: true });
  },
};

export const kickContextMenu: ContextMenuCommand = {
  data: new ContextMenuCommandBuilder()
    .setName("Expulser")
    .setType(ApplicationCommandType.User)
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction: UserContextMenuCommandInteraction) {
    if (!hasDiscordPermission(interaction, PermissionFlagsBits.KickMembers)) {
      await interaction.reply({ content: "❌ Il te faut la permission Discord **Expulser des membres**.", ephemeral: true });
      return;
    }
    const target = interaction.targetUser;
    const member = await interaction.guild!.members.fetch(target.id).catch(() => null);
    if (!member || !member.kickable) {
      await interaction.reply({ content: "❌ Impossible d'expulser ce membre.", ephemeral: true });
      return;
    }
    await member.kick(CONTEXT_MENU_REASON);
    const actor = await resolveActorContext(interaction);
    await recordKick(actor, { guildId: actor.guildId, targetDiscordId: target.id, reason: CONTEXT_MENU_REASON });
    await interaction.reply({ content: `👢 **${target.tag}** a été expulsé.`, ephemeral: true });
  },
};

export const timeoutContextMenu: ContextMenuCommand = {
  data: new ContextMenuCommandBuilder()
    .setName(`Timeout ${DEFAULT_TIMEOUT_MINUTES} min`)
    .setType(ApplicationCommandType.User)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction: UserContextMenuCommandInteraction) {
    if (!hasDiscordPermission(interaction, PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({ content: "❌ Il te faut la permission Discord **Modérer les membres**.", ephemeral: true });
      return;
    }
    const target = interaction.targetUser;
    const member = await interaction.guild!.members.fetch(target.id).catch(() => null);
    if (!member || !member.moderatable) {
      await interaction.reply({ content: "❌ Impossible de mettre ce membre en timeout.", ephemeral: true });
      return;
    }
    await member.timeout(DEFAULT_TIMEOUT_MINUTES * 60_000, CONTEXT_MENU_REASON);
    const actor = await resolveActorContext(interaction);
    await recordTimeout(actor, {
      guildId: actor.guildId,
      targetDiscordId: target.id,
      reason: CONTEXT_MENU_REASON,
      durationMinutes: DEFAULT_TIMEOUT_MINUTES,
    });
    await interaction.reply({ content: `⏱️ **${target.tag}** est en timeout pour ${DEFAULT_TIMEOUT_MINUTES} minutes.`, ephemeral: true });
  },
};
