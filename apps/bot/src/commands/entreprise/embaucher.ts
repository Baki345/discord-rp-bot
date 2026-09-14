import type { ChatInputCommandInteraction } from "discord.js";
import { hireEmployee, getActiveCharacter, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeEmbaucher(interaction: ChatInputCommandInteraction) {
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
    const employee = await hireEmployee(actor, { guildId: actor.guildId, companyId, characterId: targetCharacter.id });
    await interaction.reply({
      content: `✅ **${targetCharacter.firstName} ${targetCharacter.lastName}** a été embauché·e comme **${employee.grade.name}**.`,
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "Seul·e le/la propriétaire de l'entreprise peut embaucher.", ephemeral: true });
      return;
    }
    if (e instanceof ServiceError && e.code === "ALREADY_EXISTS") {
      await interaction.reply({ content: "Ce joueur travaille déjà ici.", ephemeral: true });
      return;
    }
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.reply({ content: "Entreprise introuvable.", ephemeral: true });
      return;
    }
    throw e;
  }
}
