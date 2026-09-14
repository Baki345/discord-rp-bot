import { PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import { recordBan, recordUnban } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";
import { hasDiscordPermission } from "./permissions.js";

export async function executeBan(interaction: ChatInputCommandInteraction) {
  if (!hasDiscordPermission(interaction, PermissionFlagsBits.BanMembers)) {
    await interaction.reply({ content: "❌ Il te faut la permission Discord **Bannir des membres**.", ephemeral: true });
    return;
  }

  const userOpt = interaction.options.getUser("membre");
  const idOpt = interaction.options.getString("id");
  const targetId = userOpt?.id ?? idOpt ?? undefined;
  if (!targetId) {
    await interaction.reply({ content: "❌ Indique un membre ou un ID Discord.", ephemeral: true });
    return;
  }

  const raison = interaction.options.getString("raison") ?? undefined;
  const purgeJours = interaction.options.getInteger("purge_jours") ?? 0;
  const dureeJours = interaction.options.getInteger("duree_jours") ?? undefined;
  const dm = interaction.options.getBoolean("dm") ?? true;

  if (dm) {
    const user = userOpt ?? (await interaction.client.users.fetch(targetId).catch(() => null));
    if (user) {
      await user
        .send(`Tu as été banni(e) de **${interaction.guild!.name}**.${raison ? `\nRaison : ${raison}` : ""}`)
        .catch(() => {});
    }
  }

  try {
    await interaction.guild!.members.ban(targetId, {
      reason: raison ?? "Aucune raison fournie",
      deleteMessageSeconds: purgeJours * 86400,
    });
  } catch {
    await interaction.reply({ content: "❌ Impossible de bannir ce compte (permissions du bot insuffisantes ?).", ephemeral: true });
    return;
  }

  const actor = await resolveActorContext(interaction);
  await recordBan(actor, {
    guildId: actor.guildId,
    targetDiscordId: targetId,
    reason: raison,
    durationMinutes: dureeJours ? dureeJours * 1440 : undefined,
  });

  await interaction.reply({
    content: `🔨 <@${targetId}> a été banni${dureeJours ? ` pour ${dureeJours} jour(s)` : " (permanent)"}.${raison ? `\nRaison : ${raison}` : ""}`,
    ephemeral: true,
  });
}

export async function executeUnban(interaction: ChatInputCommandInteraction) {
  if (!hasDiscordPermission(interaction, PermissionFlagsBits.BanMembers)) {
    await interaction.reply({ content: "❌ Il te faut la permission Discord **Bannir des membres**.", ephemeral: true });
    return;
  }

  const targetId = interaction.options.getString("id", true);
  const raison = interaction.options.getString("raison") ?? undefined;

  try {
    await interaction.guild!.members.unban(targetId, raison ?? "Aucune raison fournie");
  } catch {
    await interaction.reply({ content: "❌ Ce compte n'est pas banni ou l'annulation a échoué.", ephemeral: true });
    return;
  }

  const actor = await resolveActorContext(interaction);
  await recordUnban(actor, { guildId: actor.guildId, targetDiscordId: targetId, reason: raison });

  await interaction.reply({ content: `✅ <@${targetId}> n'est plus banni.${raison ? `\nRaison : ${raison}` : ""}`, ephemeral: true });
}
