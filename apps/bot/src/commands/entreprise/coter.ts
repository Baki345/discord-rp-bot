import type { ChatInputCommandInteraction } from "discord.js";
import { listCompanyOnMarket, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeCoter(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const companyId = interaction.options.getString("entreprise", true);
  const totalShares = interaction.options.getInteger("actions", true);
  const initialPrice = interaction.options.getNumber("prix-initial", true);

  try {
    await listCompanyOnMarket(actor, {
      guildId: actor.guildId,
      companyId,
      totalShares,
      initialSharePriceCents: Math.round(initialPrice * 100),
    });
    await interaction.reply({ content: `✅ Entreprise cotée en bourse — ${totalShares} action(s) à ${initialPrice.toFixed(2)} $.`, ephemeral: true });
  } catch (e) {
    if (e instanceof ServiceError && (e.code === "FORBIDDEN" || e.code === "ALREADY_EXISTS" || e.code === "VALIDATION_ERROR")) {
      await interaction.reply({
        content: e.code === "FORBIDDEN" ? "Tu n'es pas propriétaire de cette entreprise." : e.message,
        ephemeral: true,
      });
      return;
    }
    throw e;
  }
}
