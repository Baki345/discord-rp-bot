import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { listRecipes } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { executeListe } from "./liste.js";
import { executeFabriquer } from "./fabriquer.js";

export const craftCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("craft")
    .setDescription("Fabriquer des objets à partir de recettes")
    .addSubcommand((sub) => sub.setName("liste").setDescription("Lister les recettes du serveur"))
    .addSubcommand((sub) =>
      sub
        .setName("fabriquer")
        .setDescription("Fabriquer un objet à partir d'une recette")
        .addStringOption((opt) => opt.setName("recette").setDescription("La recette").setRequired(true).setAutocomplete(true)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "liste") return executeListe(interaction);
    if (sub === "fabriquer") return executeFabriquer(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    if (interaction.options.getFocused(true).name !== "recette") return;
    const search = String(interaction.options.getFocused(true).value).toLowerCase();
    const recipes = await listRecipes(interaction.guildId!);
    const filtered = recipes
      .filter((r) => r.name.toLowerCase().includes(search))
      .slice(0, 25)
      .map((r) => ({ name: `${r.name} → ${r.resultQuantity}× ${r.resultItem.name}`, value: r.id }));
    await interaction.respond(filtered);
  },
};
