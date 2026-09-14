import type { ChatInputCommandInteraction } from "discord.js";
import { sellShares, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, formatCents, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeVendre(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const companyId = interaction.options.getString("entreprise", true);
  const quantity = interaction.options.getInteger("quantite", true);

  const character = await requireActiveCharacter(actor.guildId, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  try {
    const result = await sellShares(actor, { guildId: actor.guildId, characterId: character.id, companyId, quantity });
    await interaction.reply({
      content: `✅ Vente de ${quantity} action(s) pour **${formatCents(result.proceedsCents)}** — nouveau cours : ${formatCents(result.newPriceCents)}.`,
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "VALIDATION_ERROR") {
      await interaction.reply({ content: e.message, ephemeral: true });
      return;
    }
    throw e;
  }
}
