import type { ChatInputCommandInteraction } from "discord.js";
import { switchActiveCharacter, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeSwitch(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);
  const characterId = interaction.options.getString("personnage", true);

  try {
    const character = await switchActiveCharacter(actor, { guildId: actor.guildId, characterId });
    await interaction.reply({
      content: `✅ Tu joues maintenant **${character.firstName} ${character.lastName}**.`,
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "Ce n'est pas ton personnage.", ephemeral: true });
      return;
    }
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.reply({ content: "Ce personnage n'existe pas (ou plus).", ephemeral: true });
      return;
    }
    throw e;
  }
}
