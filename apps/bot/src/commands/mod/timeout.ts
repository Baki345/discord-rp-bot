import { PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import { recordTimeout, recordUntimeout } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";
import { hasDiscordPermission } from "./permissions.js";

export async function executeTimeout(interaction: ChatInputCommandInteraction) {
  if (!hasDiscordPermission(interaction, PermissionFlagsBits.ModerateMembers)) {
    await interaction.reply({ content: "❌ Il te faut la permission Discord **Modérer les membres**.", ephemeral: true });
    return;
  }

  const target = interaction.options.getUser("membre", true);
  const minutes = interaction.options.getInteger("minutes", true);
  const raison = interaction.options.getString("raison") ?? undefined;

  const member = await interaction.guild!.members.fetch(target.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: "❌ Ce membre n'est pas sur le serveur.", ephemeral: true });
    return;
  }
  if (!member.moderatable) {
    await interaction.reply({ content: "❌ Impossible de mettre ce membre en timeout (rôle trop élevé ?).", ephemeral: true });
    return;
  }

  await member.timeout(minutes * 60_000, raison ?? "Aucune raison fournie");

  const actor = await resolveActorContext(interaction);
  await recordTimeout(actor, { guildId: actor.guildId, targetDiscordId: target.id, reason: raison, durationMinutes: minutes });

  await interaction.reply({
    content: `⏱️ **${target.tag}** est en timeout pour ${minutes} minute(s).${raison ? `\nRaison : ${raison}` : ""}`,
    ephemeral: true,
  });
}

export async function executeUntimeout(interaction: ChatInputCommandInteraction) {
  if (!hasDiscordPermission(interaction, PermissionFlagsBits.ModerateMembers)) {
    await interaction.reply({ content: "❌ Il te faut la permission Discord **Modérer les membres**.", ephemeral: true });
    return;
  }

  const target = interaction.options.getUser("membre", true);
  const raison = interaction.options.getString("raison") ?? undefined;

  const member = await interaction.guild!.members.fetch(target.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: "❌ Ce membre n'est pas sur le serveur.", ephemeral: true });
    return;
  }

  await member.timeout(null, raison ?? "Aucune raison fournie");

  const actor = await resolveActorContext(interaction);
  await recordUntimeout(actor, { guildId: actor.guildId, targetDiscordId: target.id, reason: raison });

  await interaction.reply({ content: `✅ Le timeout de **${target.tag}** a été retiré.${raison ? `\nRaison : ${raison}` : ""}`, ephemeral: true });
}
