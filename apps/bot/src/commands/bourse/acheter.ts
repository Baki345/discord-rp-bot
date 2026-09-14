import type { ChatInputCommandInteraction } from "discord.js";
import { buyShares, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, formatCents, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeAcheter(interaction: ChatInputCommandInteraction) {
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
    const result = await buyShares(actor, { guildId: actor.guildId, characterId: character.id, companyId, quantity });
    await interaction.reply({
      content: `✅ Achat de ${quantity} action(s) pour **${formatCents(result.costCents)}** — nouveau cours : ${formatCents(result.newPriceCents)}.`,
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && (e.code === "VALIDATION_ERROR" || e.code === "INSUFFICIENT_CASH")) {
      await interaction.reply({ content: e.message || "Fonds insuffisants.", ephemeral: true });
      return;
    }
    throw e;
  }
}
