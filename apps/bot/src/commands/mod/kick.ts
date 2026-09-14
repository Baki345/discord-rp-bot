import { PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import { recordKick } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";
import { hasDiscordPermission } from "./permissions.js";

export async function executeKick(interaction: ChatInputCommandInteraction) {
  if (!hasDiscordPermission(interaction, PermissionFlagsBits.KickMembers)) {
    await interaction.reply({ content: "❌ Il te faut la permission Discord **Expulser des membres**.", ephemeral: true });
    return;
  }

  const target = interaction.options.getUser("membre", true);
  const raison = interaction.options.getString("raison") ?? undefined;

  const member = await interaction.guild!.members.fetch(target.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: "❌ Ce membre n'est pas sur le serveur.", ephemeral: true });
    return;
  }
  if (!member.kickable) {
    await interaction.reply({ content: "❌ Impossible d'expulser ce membre (rôle trop élevé ?).", ephemeral: true });
    return;
  }

  await member.kick(raison ?? "Aucune raison fournie");

  const actor = await resolveActorContext(interaction);
  await recordKick(actor, { guildId: actor.guildId, targetDiscordId: target.id, reason: raison });

  await interaction.reply({ content: `👢 **${target.tag}** a été expulsé.${raison ? `\nRaison : ${raison}` : ""}`, ephemeral: true });
}
