import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { BotCommand } from "../../client.js";
import { executeDeposer } from "./deposer.js";
import { executeRetirer } from "./retirer.js";

export const banqueCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("banque")
    .setDescription("Gérer le compte bancaire de ton personnage actif")
    .addSubcommand((sub) =>
      sub
        .setName("deposer")
        .setDescription("Déposer du liquide sur ton compte")
        .addNumberOption((opt) => opt.setName("montant").setDescription("Montant en $").setRequired(true).setMinValue(0.01)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("retirer")
        .setDescription("Retirer de l'argent de ton compte")
        .addNumberOption((opt) => opt.setName("montant").setDescription("Montant en $").setRequired(true).setMinValue(0.01)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "deposer") return executeDeposer(interaction);
    if (sub === "retirer") return executeRetirer(interaction);
  },
};
