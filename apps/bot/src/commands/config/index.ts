import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import { listRPRoles } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { executeSetup } from "./setup.js";
import { executeSalonLogs } from "./salon-logs.js";
import { executeRolePermission } from "./role-permission.js";

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
    )
    .addSubcommand((sub) =>
      sub
        .setName("role-permission")
        .setDescription("Attribuer ou retirer un rôle RP (permissions déléguées) à un membre")
        .addStringOption((opt) =>
          opt
            .setName("action")
            .setDescription("Attribuer ou retirer")
            .setRequired(true)
            .addChoices({ name: "Attribuer", value: "attribuer" }, { name: "Retirer", value: "retirer" }),
        )
        .addUserOption((opt) => opt.setName("joueur").setDescription("Le membre concerné").setRequired(true))
        .addStringOption((opt) => opt.setName("role").setDescription("Le rôle RP").setRequired(true).setAutocomplete(true)),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "setup") return executeSetup(interaction);
    if (sub === "salon-logs") return executeSalonLogs(interaction);
    if (sub === "role-permission") return executeRolePermission(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    if (interaction.options.getSubcommand() !== "role-permission") return;
    const focused = interaction.options.getFocused().toLowerCase();
    const roles = await listRPRoles(interaction.guildId!);
    const filtered = roles
      .filter((r) => r.name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((r) => ({ name: r.name, value: r.id }));
    await interaction.respond(filtered);
  },
};
