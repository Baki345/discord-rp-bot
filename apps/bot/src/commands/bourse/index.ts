import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { listMarket } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { executeListe } from "./liste.js";
import { executeAcheter } from "./acheter.js";
import { executeVendre } from "./vendre.js";
import { executePortefeuille } from "./portefeuille.js";

export const bourseCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("bourse")
    .setDescription("Acheter et vendre des actions d'entreprises cotées")
    .addSubcommand((sub) => sub.setName("liste").setDescription("Voir les entreprises cotées en bourse"))
    .addSubcommand((sub) =>
      sub
        .setName("acheter")
        .setDescription("Acheter des actions")
        .addStringOption((opt) => opt.setName("entreprise").setDescription("L'entreprise").setRequired(true).setAutocomplete(true))
        .addIntegerOption((opt) => opt.setName("quantite").setDescription("Nombre d'actions").setRequired(true).setMinValue(1)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("vendre")
        .setDescription("Vendre des actions")
        .addStringOption((opt) => opt.setName("entreprise").setDescription("L'entreprise").setRequired(true).setAutocomplete(true))
        .addIntegerOption((opt) => opt.setName("quantite").setDescription("Nombre d'actions").setRequired(true).setMinValue(1)),
    )
    .addSubcommand((sub) => sub.setName("portefeuille").setDescription("Voir tes actions détenues")),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "liste") return executeListe(interaction);
    if (sub === "acheter") return executeAcheter(interaction);
    if (sub === "vendre") return executeVendre(interaction);
    if (sub === "portefeuille") return executePortefeuille(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    if (interaction.options.getFocused(true).name !== "entreprise") return;
    const search = String(interaction.options.getFocused(true).value).toLowerCase();
    const market = await listMarket(interaction.guildId!);
    const filtered = market
      .filter((c) => c.name.toLowerCase().includes(search))
      .slice(0, 25)
      .map((c) => ({ name: `${c.name} — ${((c.sharePriceCents ?? 0) / 100).toFixed(2)} $`, value: c.id }));
    await interaction.respond(filtered);
  },
};
