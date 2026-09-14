import type { ButtonInteraction } from "discord.js";
import type { ButtonHandler } from "../client.js";
import { buildInteractionPayload } from "../commands/interaction/index.js";

export const interactionRenvoyerHandler: ButtonHandler = {
  customIdPrefix: "interaction:renvoyer:",
  async execute(interaction: ButtonInteraction) {
    const [, , action, giverId, receiverId] = interaction.customId.split(":");
    if (interaction.user.id !== receiverId) {
      await interaction.reply({ content: "❌ Seule la personne qui a reçu l'interaction peut la renvoyer.", ephemeral: true });
      return;
    }

    await interaction.update({ components: [] });
    // giverId/receiverId are swapped: the original recipient is now the one giving it back.
    const payload = await buildInteractionPayload(interaction.guildId!, action!, receiverId!, giverId!);
    await interaction.followUp({ embeds: payload.embeds, components: payload.components });
    if (payload.gifMissing) await interaction.followUp({ content: "ℹ️ (le service de GIF est indisponible pour le moment)", ephemeral: true });
  },
};
