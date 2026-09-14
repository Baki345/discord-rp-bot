import type { ChatInputCommandInteraction } from "discord.js";
import { leaveJob, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeDemissionner(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);

  const character = await requireActiveCharacter(actor.guildId, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  try {
    await leaveJob(actor, { guildId: actor.guildId, characterId: character.id });
    await interaction.reply({ content: `✅ **${character.firstName} ${character.lastName}** a démissionné.`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "NOT_FOUND") {
      await interaction.reply({ content: "Tu n'as pas de métier actuellement.", ephemeral: true });
      return;
    }
    throw e;
  }
}
