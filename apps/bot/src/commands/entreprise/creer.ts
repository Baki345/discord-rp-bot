import type { ChatInputCommandInteraction } from "discord.js";
import { createCompany, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeCreer(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const name = interaction.options.getString("nom", true);
  const description = interaction.options.getString("description") ?? undefined;

  const owner = await requireActiveCharacter(actor.guildId, interaction.user.id);
  if (!owner) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  try {
    const company = await createCompany(actor, { guildId: actor.guildId, ownerCharacterId: owner.id, name, description });
    await interaction.reply({ content: `✅ Entreprise **${company.name}** créée — tu en es le/la propriétaire.`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "ALREADY_EXISTS") {
      await interaction.reply({ content: "Une entreprise porte déjà ce nom.", ephemeral: true });
      return;
    }
    if (e instanceof ServiceError && e.code === "QUOTA_EXCEEDED") {
      await interaction.reply({ content: `❌ ${e.message}`, ephemeral: true });
      return;
    }
    throw e;
  }
}
