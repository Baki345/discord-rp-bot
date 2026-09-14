import type { ChatInputCommandInteraction } from "discord.js";
import { joinJob, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executePostuler(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const jobId = interaction.options.getString("metier", true);

  const character = await requireActiveCharacter(actor.guildId, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  try {
    const membership = await joinJob(actor, { guildId: actor.guildId, characterId: character.id, jobId });
    await interaction.reply({
      content: `✅ **${character.firstName} ${character.lastName}** travaille maintenant comme **${membership.grade.name}** chez **${membership.job.name}**.`,
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.reply({ content: "Ce métier n'existe pas.", ephemeral: true });
      return;
    }
    throw e;
  }
}
