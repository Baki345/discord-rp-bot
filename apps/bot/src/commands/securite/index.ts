import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import type { BotCommand } from "../../client.js";
import { executeStaffExtraOwner, executeStaffTrustedAdmin, executeStaffRetirer, executeStaffListe } from "./staff.js";
import { executeCleSecoursGenerer } from "./rescue.js";

/**
 * Visible only to server Administrators — the real per-action gating
 * (only the real owner can add an extra owner, etc.) lives in
 * security-staff.service.ts, since "Administrator" alone isn't a fine
 * enough distinction for who may hand out EXTRA_OWNER.
 */
export const securiteCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("securite")
    .setDescription("Hiérarchie de sécurité du serveur")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommandGroup((group) =>
      group
        .setName("staff")
        .setDescription("Gérer les extra owners et trusted admins")
        .addSubcommand((sub) =>
          sub
            .setName("extra-owner")
            .setDescription("Ajouter un extra owner (propriétaire uniquement)")
            .addUserOption((opt) => opt.setName("membre").setDescription("Le membre").setRequired(true)),
        )
        .addSubcommand((sub) =>
          sub
            .setName("trusted-admin")
            .setDescription("Ajouter un trusted admin")
            .addUserOption((opt) => opt.setName("membre").setDescription("Le membre").setRequired(true)),
        )
        .addSubcommand((sub) =>
          sub
            .setName("retirer")
            .setDescription("Retirer un membre du staff de sécurité")
            .addUserOption((opt) => opt.setName("membre").setDescription("Le membre").setRequired(true)),
        )
        .addSubcommand((sub) => sub.setName("liste").setDescription("Voir la hiérarchie de sécurité")),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("cle-secours")
        .setDescription("Clé de récupération du serveur")
        .addSubcommand((sub) => sub.setName("generer").setDescription("Générer une nouvelle clé de secours (propriétaire uniquement)")),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();
    if (group === "staff") {
      if (sub === "extra-owner") return executeStaffExtraOwner(interaction);
      if (sub === "trusted-admin") return executeStaffTrustedAdmin(interaction);
      if (sub === "retirer") return executeStaffRetirer(interaction);
      if (sub === "liste") return executeStaffListe(interaction);
    }
    if (group === "cle-secours") {
      if (sub === "generer") return executeCleSecoursGenerer(interaction);
    }
  },
};
