import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import type { BotCommand } from "../../client.js";
import { executeStaffExtraOwner, executeStaffTrustedAdmin, executeStaffRetirer, executeStaffListe } from "./staff.js";
import { executeCleSecoursGenerer } from "./rescue.js";
import { executeQuarantineSetup, executeQuarantineMettre, executeQuarantineRetirer, executeQuarantineListe } from "./quarantineCmds.js";
import { executeVerificationSetup, executeVerificationPanneau, executeVerificationManuel } from "./verification.js";
import {
  executeAutomodSetup,
  executeAutomodMotAjouter,
  executeAutomodMotRetirer,
  executeAutomodDomaineAjouter,
  executeAutomodDomaineRetirer,
} from "./automod.js";

const ACTION_ECHEC_CHOICES = [
  { name: "Aucune", value: "NONE" },
  { name: "Expulsion", value: "KICK" },
  { name: "Bannissement", value: "BAN" },
] as const;

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
    )
    .addSubcommandGroup((group) =>
      group
        .setName("quarantaine")
        .setDescription("Isoler un compte sans le bannir")
        .addSubcommand((sub) => sub.setName("setup").setDescription("Créer/rafraîchir le rôle de quarantaine sur tous les salons"))
        .addSubcommand((sub) =>
          sub
            .setName("mettre")
            .setDescription("Mettre un membre en quarantaine")
            .addUserOption((opt) => opt.setName("membre").setDescription("Le membre").setRequired(true))
            .addStringOption((opt) => opt.setName("raison").setDescription("Raison")),
        )
        .addSubcommand((sub) =>
          sub
            .setName("retirer")
            .setDescription("Retirer un membre de la quarantaine (restaure ses rôles précédents)")
            .addUserOption((opt) => opt.setName("membre").setDescription("Le membre").setRequired(true))
            .addStringOption((opt) => opt.setName("raison").setDescription("Raison")),
        )
        .addSubcommand((sub) => sub.setName("liste").setDescription("Voir les membres actuellement en quarantaine")),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("verification")
        .setDescription("Vérification des nouveaux membres")
        .addSubcommand((sub) =>
          sub
            .setName("setup")
            .setDescription("Configurer la vérification (vide = afficher la config actuelle)")
            .addBooleanOption((opt) => opt.setName("actif").setDescription("Activer/désactiver la vérification"))
            .addStringOption((opt) =>
              opt
                .setName("mode")
                .setDescription("Mode de vérification")
                .addChoices(
                  { name: "Bouton", value: "BUTTON" },
                  { name: "Modal (texte à confirmer)", value: "MODAL" },
                  { name: "Grille (captcha sans image)", value: "GRID_CAPTCHA" },
                  { name: "Web (dashboard)", value: "WEB" },
                  { name: "Instantané", value: "INSTANT" },
                ),
            )
            .addStringOption((opt) =>
              opt
                .setName("cible")
                .setDescription("Qui doit se vérifier")
                .addChoices({ name: "Tout le monde", value: "ALL" }, { name: "Comptes suspects seulement", value: "SUSPECT_ONLY" }),
            )
            .addRoleOption((opt) => opt.setName("role_verifie").setDescription("Rôle donné une fois vérifié"))
            .addStringOption((opt) => opt.setName("action_echec").setDescription("Action en cas d'échec/délai dépassé").addChoices(...ACTION_ECHEC_CHOICES))
            .addIntegerOption((opt) => opt.setName("delai_minutes").setDescription("Délai pour se vérifier, en minutes").setMinValue(1).setMaxValue(10080))
            .addBooleanOption((opt) => opt.setName("quarantaine_legacy").setDescription("Mode legacy : quarantaine dès l'arrivée (déconseillé)")),
        )
        .addSubcommand((sub) => sub.setName("panneau").setDescription("Poster le panneau de vérification dans ce salon"))
        .addSubcommand((sub) =>
          sub
            .setName("manuel")
            .setDescription("Vérifier un membre manuellement")
            .addUserOption((opt) => opt.setName("membre").setDescription("Le membre").setRequired(true)),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("automod")
        .setDescription("Auto-modération par chaleur")
        .addSubcommand((sub) =>
          sub
            .setName("setup")
            .setDescription("Configurer l'auto-modération (vide = afficher la config actuelle)")
            .addBooleanOption((opt) => opt.setName("actif").setDescription("Activer/désactiver l'auto-modération"))
            .addIntegerOption((opt) => opt.setName("chaleur_max").setDescription("Seuil de chaleur déclenchant une sanction").setMinValue(1))
            .addNumberOption((opt) => opt.setName("decroissance_par_seconde").setDescription("Vitesse de descente de la chaleur").setMinValue(0))
            .addIntegerOption((opt) => opt.setName("strikes_avant_cap").setDescription("Nombre de strikes avant le timeout \"cap\"").setMinValue(1))
            .addIntegerOption((opt) => opt.setName("timeout_normal_minutes").setDescription("Durée du timeout normal, en minutes").setMinValue(1))
            .addIntegerOption((opt) => opt.setName("timeout_cap_minutes").setDescription("Durée du timeout cap, en minutes").setMinValue(1))
            .addBooleanOption((opt) => opt.setName("reset_apres_timeout").setDescription("Remettre la chaleur à zéro après un timeout")),
        )
        .addSubcommand((sub) =>
          sub
            .setName("mot-ajouter")
            .setDescription("Ajouter un mot à la liste noire")
            .addStringOption((opt) => opt.setName("mot").setDescription("Le mot ou l'expression").setRequired(true)),
        )
        .addSubcommand((sub) =>
          sub
            .setName("mot-retirer")
            .setDescription("Retirer un mot de la liste noire")
            .addStringOption((opt) => opt.setName("mot").setDescription("Le mot ou l'expression").setRequired(true)),
        )
        .addSubcommand((sub) =>
          sub
            .setName("domaine-ajouter")
            .setDescription("Ajouter un domaine à la liste noire")
            .addStringOption((opt) => opt.setName("domaine").setDescription("Le domaine (ex: exemple.com)").setRequired(true)),
        )
        .addSubcommand((sub) =>
          sub
            .setName("domaine-retirer")
            .setDescription("Retirer un domaine de la liste noire")
            .addStringOption((opt) => opt.setName("domaine").setDescription("Le domaine").setRequired(true)),
        ),
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
    if (group === "quarantaine") {
      if (sub === "setup") return executeQuarantineSetup(interaction);
      if (sub === "mettre") return executeQuarantineMettre(interaction);
      if (sub === "retirer") return executeQuarantineRetirer(interaction);
      if (sub === "liste") return executeQuarantineListe(interaction);
    }
    if (group === "verification") {
      if (sub === "setup") return executeVerificationSetup(interaction);
      if (sub === "panneau") return executeVerificationPanneau(interaction);
      if (sub === "manuel") return executeVerificationManuel(interaction);
    }
    if (group === "automod") {
      if (sub === "setup") return executeAutomodSetup(interaction);
      if (sub === "mot-ajouter") return executeAutomodMotAjouter(interaction);
      if (sub === "mot-retirer") return executeAutomodMotRetirer(interaction);
      if (sub === "domaine-ajouter") return executeAutomodDomaineAjouter(interaction);
      if (sub === "domaine-retirer") return executeAutomodDomaineRetirer(interaction);
    }
  },
};
