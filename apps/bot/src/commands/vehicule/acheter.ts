import type { ChatInputCommandInteraction } from "discord.js";
import { buyVehicle, ServiceError } from "@discord-rp/core";
import { requireActiveCharacter, formatCents, NO_ACTIVE_CHARACTER_MESSAGE } from "../../lib/require-active-character.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeAcheter(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const modelId = interaction.options.getString("modele", true);
  const plate = interaction.options.getString("plaque", true);
  const paymentMethod = interaction.options.getString("paiement", true) as "cash" | "bank";

  const character = await requireActiveCharacter(actor.guildId, interaction.user.id);
  if (!character) {
    await interaction.reply({ content: NO_ACTIVE_CHARACTER_MESSAGE, ephemeral: true });
    return;
  }

  try {
    const vehicle = await buyVehicle(actor, { guildId: actor.guildId, characterId: character.id, modelId, plate, paymentMethod });
    await interaction.reply({
      content: `✅ Tu as acheté une **${vehicle.model.name}** (plaque **${vehicle.plate}**) pour **${formatCents(vehicle.model.priceCents)}**.`,
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && (e.code === "INSUFFICIENT_CASH" || e.code === "INSUFFICIENT_FUNDS")) {
      await interaction.reply({ content: "Tu n'as pas assez d'argent pour ce véhicule.", ephemeral: true });
      return;
    }
    if (e instanceof ServiceError && e.code === "ALREADY_EXISTS") {
      await interaction.reply({ content: "Cette plaque est déjà utilisée — réessaie avec une autre.", ephemeral: true });
      return;
    }
    if (e instanceof ServiceError && e.code === "QUOTA_EXCEEDED") {
      await interaction.reply({ content: `❌ ${e.message}`, ephemeral: true });
      return;
    }
    throw e;
  }
}
