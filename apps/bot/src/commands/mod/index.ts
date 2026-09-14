import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import type { BotCommand } from "../../client.js";
import { executeWarn } from "./warn.js";
import { executeBan, executeUnban } from "./ban.js";
import { executeKick } from "./kick.js";
import { executeTimeout, executeUntimeout } from "./timeout.js";
import { executePurge } from "./purge.js";
import { executePseudo } from "./pseudo.js";
import { executeHistorique } from "./historique.js";

/**
 * Baseline visibility gate: Discord hides /mod entirely from members without
 * ModerateMembers. Each subcommand additionally checks the specific Discord
 * permission it actually needs (BanMembers, KickMembers, ManageMessages,
 * ManageNicknames) so a "timeout-only" moderator gets a clear refusal
 * instead of a confusing Discord API error.
 */
export const modCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("mod")
    .setDescription("Commandes de modération")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName("warn")
        .setDescription("Avertir un membre (points cumulables)")
        .addUserOption((opt) => opt.setName("membre").setDescription("Le membre à avertir").setRequired(true))
        .addIntegerOption((opt) => opt.setName("points").setDescription("Points d'avertissement (défaut 1)").setMinValue(1).setMaxValue(100))
        .addStringOption((opt) => opt.setName("raison").setDescription("Raison")),
    )
    .addSubcommand((sub) =>
      sub
        .setName("ban")
        .setDescription("Bannir un membre (présent ou non sur le serveur)")
        .addUserOption((opt) => opt.setName("membre").setDescription("Le membre (s'il est présent)"))
        .addStringOption((opt) => opt.setName("id").setDescription("ID Discord (si le compte n'est pas sur le serveur)"))
        .addStringOption((opt) => opt.setName("raison").setDescription("Raison"))
        .addIntegerOption((opt) => opt.setName("purge_jours").setDescription("Purger les messages des X derniers jours (0-7)").setMinValue(0).setMaxValue(7))
        .addIntegerOption((opt) => opt.setName("duree_jours").setDescription("Durée du ban en jours (laisser vide = permanent)").setMinValue(1))
        .addBooleanOption((opt) => opt.setName("dm").setDescription("Prévenir le membre en message privé avant le ban (défaut oui)")),
    )
    .addSubcommand((sub) =>
      sub
        .setName("unban")
        .setDescription("Annuler un bannissement")
        .addStringOption((opt) => opt.setName("id").setDescription("ID Discord du membre banni").setRequired(true))
        .addStringOption((opt) => opt.setName("raison").setDescription("Raison")),
    )
    .addSubcommand((sub) =>
      sub
        .setName("kick")
        .setDescription("Expulser un membre")
        .addUserOption((opt) => opt.setName("membre").setDescription("Le membre").setRequired(true))
        .addStringOption((opt) => opt.setName("raison").setDescription("Raison")),
    )
    .addSubcommand((sub) =>
      sub
        .setName("timeout")
        .setDescription("Mettre un membre en isolement temporaire (timeout)")
        .addUserOption((opt) => opt.setName("membre").setDescription("Le membre").setRequired(true))
        .addIntegerOption((opt) => opt.setName("minutes").setDescription("Durée en minutes (max 40320 = 28 jours)").setRequired(true).setMinValue(1).setMaxValue(40320))
        .addStringOption((opt) => opt.setName("raison").setDescription("Raison")),
    )
    .addSubcommand((sub) =>
      sub
        .setName("untimeout")
        .setDescription("Retirer le timeout d'un membre")
        .addUserOption((opt) => opt.setName("membre").setDescription("Le membre").setRequired(true))
        .addStringOption((opt) => opt.setName("raison").setDescription("Raison")),
    )
    .addSubcommand((sub) =>
      sub
        .setName("purge")
        .setDescription("Supprimer plusieurs messages d'un salon")
        .addIntegerOption((opt) => opt.setName("nombre").setDescription("Nombre de messages à supprimer (max 100)").setRequired(true).setMinValue(1).setMaxValue(100)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("pseudo")
        .setDescription("Nettoyer le pseudo d'un membre (dehoist / caractères problématiques)")
        .addUserOption((opt) => opt.setName("membre").setDescription("Le membre").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("historique")
        .setDescription("Voir l'historique de sanctions d'un membre")
        .addUserOption((opt) => opt.setName("membre").setDescription("Le membre").setRequired(true)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "warn") return executeWarn(interaction);
    if (sub === "ban") return executeBan(interaction);
    if (sub === "unban") return executeUnban(interaction);
    if (sub === "kick") return executeKick(interaction);
    if (sub === "timeout") return executeTimeout(interaction);
    if (sub === "untimeout") return executeUntimeout(interaction);
    if (sub === "purge") return executePurge(interaction);
    if (sub === "pseudo") return executePseudo(interaction);
    if (sub === "historique") return executeHistorique(interaction);
  },
};
