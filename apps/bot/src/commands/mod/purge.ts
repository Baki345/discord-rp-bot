import { PermissionFlagsBits, ChannelType, type ChatInputCommandInteraction } from "discord.js";
import { writeAuditLog } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";
import { hasDiscordPermission } from "./permissions.js";

export async function executePurge(interaction: ChatInputCommandInteraction) {
  if (!hasDiscordPermission(interaction, PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({ content: "❌ Il te faut la permission Discord **Gérer les messages**.", ephemeral: true });
    return;
  }

  const nombre = interaction.options.getInteger("nombre", true);
  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: "❌ Cette commande doit être utilisée dans un salon textuel.", ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const deleted = await channel.bulkDelete(nombre, true).catch(() => null);
  if (!deleted) {
    await interaction.editReply("❌ Suppression impossible (messages de plus de 14 jours ?).");
    return;
  }

  const actor = await resolveActorContext(interaction);
  await writeAuditLog({
    guildId: actor.guildId,
    actorType: "DISCORD_USER",
    actorDiscordId: actor.discordUserId,
    action: "moderation.purge",
    targetType: "Channel",
    targetId: channel.id,
    metadata: { requested: nombre, deleted: deleted.size },
  });

  await interaction.editReply(`🧹 ${deleted.size} message(s) supprimé(s).`);
}
