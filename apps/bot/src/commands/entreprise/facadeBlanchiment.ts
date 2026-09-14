import type { ChatInputCommandInteraction } from "discord.js";
import { setLaunderingFront, ServiceError } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeFacadeBlanchiment(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const actor = await resolveActorContext(interaction);
  const companyId = interaction.options.getString("entreprise", true);
  const actif = interaction.options.getBoolean("actif", true);

  try {
    const company = await setLaunderingFront(actor, { guildId: actor.guildId, companyId, isLaunderingFront: actif });
    await interaction.reply({
      content: actif
        ? `✅ **${company.name}** est maintenant une façade de blanchiment.`
        : `✅ **${company.name}** n'est plus une façade de blanchiment.`,
      ephemeral: true,
    });
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") {
      await interaction.reply({ content: "Tu n'es pas propriétaire de cette entreprise.", ephemeral: true });
      return;
    }
    throw e;
  }
}
