import type { ChatInputCommandInteraction } from "discord.js";
import { withdrawFromBank, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, formatCents, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeRetirer(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const amount = interaction.options.getNumber("montant", true);

  const character = await requireActiveCharacter(actor.guildId, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  try {
    const result = await withdrawFromBank(actor, { guildId: actor.guildId, characterId: character.id, amountCents: Math.round(amount * 100) });
    await interaction.reply({ content: `✅ Retiré. Nouveau solde bancaire : **${formatCents(result.balanceCents)}**.`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "INSUFFICIENT_FUNDS") {
      await interaction.reply({ content: "Fonds insuffisants sur ton compte.", ephemeral: true });
      return;
    }
    throw e;
  }
}
