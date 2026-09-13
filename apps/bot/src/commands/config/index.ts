import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, type ChatInputCommandInteraction } from "discord.js";
import type { BotCommand } from "../../client.js";
import { executeSetup } from "./setup.js";
import { executeSalonLogs } from "./salon-logs.js";

export const configCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configurer le serveur pour le RP")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) => sub.setName("setup").setDescription("Initialiser (ou réinitialiser) la configuration RP de ce serveur"))
    .addSubcommand((sub) =>
      sub
        .setName("salon-logs")
        .setDescription("Définir le salon où envoyer un type de logs")
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("Type de logs")
            .setRequired(true)
            .addChoices(
              { name: "Journal d'audit", value: "audit" },
              { name: "Économie", value: "economy" },
              { name: "Modération", value: "moderation" },
            ),
        )
        .addChannelOption((opt) =>
          opt
            .setName("salon")
            .setDescription("Salon cible (laisser vide pour désactiver)")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false),
        ),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "setup") return executeSetup(interaction);
    if (sub === "salon-logs") return executeSalonLogs(interaction);
  },
};
