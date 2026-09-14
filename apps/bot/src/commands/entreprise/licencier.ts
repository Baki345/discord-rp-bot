import type { ChatInputCommandInteraction } from "discord.js";
import { fireEmployee, getActiveCharacter, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeLicencier(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const companyId = interaction.options.getString("entreprise", true);
  const targetUser = interaction.options.getUser("joueur", true);

  const targetCharacter = await getActiveCharacter(actor.guildId, targetUser.id);
  if (!targetCharacter) {
    await interaction.reply({ content: `${targetUser} n'a pas de personnage actif dans ce serveur.`, ephemeral: true });
    return;
  }

  try {
    await fireEmployee(actor, { guildId: actor.guildId, companyId, characterId: targetCharacter.id });
    await interaction.reply({ content: `✅ **${targetCharacter.firstName} ${targetCharacter.lastName}** a été licencié·e.`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "Seul·e le/la propriétaire de l'entreprise peut licencier.", ephemeral: true });
      return;
    }
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.reply({ content: "Ce joueur ne travaille pas ici.", ephemeral: true });
      return;
    }
    throw e;
  }
}
