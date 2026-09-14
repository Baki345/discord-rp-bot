import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { listDrugTypes } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { executeCatalogue } from "./catalogue.js";
import { executeProduire } from "./produire.js";
import { executeVendre } from "./vendre.js";

export const drogueCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("drogue")
    .setDescription("Production et vente de substances RP")
    .addSubcommand((sub) => sub.setName("catalogue").setDescription("Lister les substances du serveur"))
    .addSubcommand((sub) =>
      sub
        .setName("produire")
        .setDescription("Produire une substance")
        .addStringOption((opt) => opt.setName("substance").setDescription("La substance").setRequired(true).setAutocomplete(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("vendre")
        .setDescription("Vendre une substance")
        .addStringOption((opt) => opt.setName("substance").setDescription("La substance").setRequired(true).setAutocomplete(true))
        .addIntegerOption((opt) => opt.setName("quantite").setDescription("Quantité").setRequired(true).setMinValue(1)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "catalogue") return executeCatalogue(interaction);
    if (sub === "produire") return executeProduire(interaction);
    if (sub === "vendre") return executeVendre(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    if (interaction.options.getFocused(true).name !== "substance") return;
    const search = String(interaction.options.getFocused(true).value).toLowerCase();
    const drugTypes = await listDrugTypes(interaction.guildId!);
    const filtered = drugTypes
      .filter((d) => d.name.toLowerCase().includes(search))
      .slice(0, 25)
      .map((d) => ({ name: d.name, value: d.id }));
    await interaction.respond(filtered);
  },
};
