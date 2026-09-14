import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { listRecipes } from "@discord-rp/core";

export async function executeListe(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) return;
  const recipes = await listRecipes(interaction.guildId!);

  const embed = new EmbedBuilder()
    .setTitle("🛠️ Recettes de fabrication")
    .setColor(0x7c3aed)
    .setDescription(
      recipes.length === 0
        ? "Aucune recette pour l'instant."
        : recipes
            .map((r) => {
              const ingredients = r.ingredients.map((i) => `${i.quantity}× ${i.item.name}`).join(", ");
              return `**${r.name}** → ${r.resultQuantity}× ${r.resultItem.name}\n　 requiert : ${ingredients}`;
            })
            .join("\n"),
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
