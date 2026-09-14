import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type ChatInputCommandInteraction } from "discord.js";
import { getCharacter, ServiceError } from "@discord-rp/core";

export const DELETE_CONFIRM_PREFIX = "personnage:delete:confirm:";

/** Deletion is irreversible from the player's side (soft delete, admins can still see it) — always confirm first. */
export async function executeDelete(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const characterId = interaction.options.getString("personnage", true);

  try {
    const character = await getCharacter(interaction.guildId!, characterId);
    const confirmButton = new ButtonBuilder()
      .setCustomId(`${DELETE_CONFIRM_PREFIX}${character.id}`)
      .setLabel(`Supprimer ${character.firstName} ${character.lastName}`)
      .setStyle(ButtonStyle.Danger);

    await interaction.reply({
      content: `⚠️ Confirme la suppression de **${character.firstName} ${character.lastName}** — cette action est irréversible.`,
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton)],
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.reply({ content: "Ce personnage n'existe pas (ou plus).", ephemeral: true });
      return;
    }
    throw e;
  }
}
