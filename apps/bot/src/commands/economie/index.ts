import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { BotCommand } from "../../client.js";
import { executeSolde } from "./solde.js";
import { executePayer } from "./payer.js";
import { executeHistorique } from "./historique.js";

export const economieCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("economie")
    .setDescription("Gérer l'argent de ton personnage actif")
    .addSubcommand((sub) => sub.setName("solde").setDescription("Voir ton argent liquide et ton solde bancaire"))
    .addSubcommand((sub) =>
      sub
        .setName("payer")
        .setDescription("Payer un autre joueur en liquide")
        .addUserOption((opt) => opt.setName("joueur").setDescription("Le joueur à payer").setRequired(true))
        .addNumberOption((opt) => opt.setName("montant").setDescription("Montant en $").setRequired(true).setMinValue(0.01))
        .addStringOption((opt) => opt.setName("raison").setDescription("Raison (optionnel)").setRequired(false)),
    )
    .addSubcommand((sub) => sub.setName("historique").setDescription("Voir tes 10 dernières transactions")),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "solde") return executeSolde(interaction);
    if (sub === "payer") return executePayer(interaction);
    if (sub === "historique") return executeHistorique(interaction);
  },
};
