import { ChannelType, SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
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
import { executeAntiNukeSetup, executeAntiNukeWhitelistUtilisateur, executeAntiNukeWhitelistCategorie } from "./antiNuke.js";
import { executeBackupCreer, executeBackupListe, executeBackupCharger, executeBackupSupprimer, executeBackupEffacer } from "./backup.js";
import { executePanicSetup, executePanicActiver, executePanicFin, executePanicStatut } from "./panic.js";
import { executeWarnEscalationActif, executeWarnEscalationAjouter, executeWarnEscalationRetirer, executeWarnEscalationListe } from "./warnEscalation.js";

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
    )
    .addSubcommandGroup((group) =>
      group
        .setName("anti-nuke")
        .setDescription("Détection en temps réel des actions destructrices")
        .addSubcommand((sub) =>
          sub
            .setName("setup")
            .setDescription("Configurer l'anti-nuke (vide = afficher la config actuelle)")
            .addBooleanOption((opt) => opt.setName("actif").setDescription("Activer/désactiver l'anti-nuke"))
            .addBooleanOption((opt) => opt.setName("mode_strict").setDescription("Mode strict : aussi surveiller les permissions de rôles et ajouts de rôles"))
            .addIntegerOption((opt) => opt.setName("seuil_par_minute").setDescription("Actions destructrices/minute déclenchant une réponse").setMinValue(1))
            .addIntegerOption((opt) => opt.setName("seuil_par_heure").setDescription("Actions destructrices/heure déclenchant une réponse").setMinValue(1))
            .addBooleanOption((opt) => opt.setName("quarantaine_auto").setDescription("Mettre l'auteur en quarantaine automatiquement")),
        )
        .addSubcommand((sub) =>
          sub
            .setName("whitelist-utilisateur")
            .setDescription("Exempter (ou retirer) un utilisateur/bot de l'anti-nuke")
            .addUserOption((opt) => opt.setName("membre").setDescription("Le membre ou bot").setRequired(true))
            .addBooleanOption((opt) => opt.setName("retirer").setDescription("Retirer de la liste blanche au lieu d'ajouter")),
        )
        .addSubcommand((sub) =>
          sub
            .setName("whitelist-categorie")
            .setDescription("Exempter (ou retirer) une catégorie de salons (ex: tickets)")
            .addChannelOption((opt) => opt.setName("categorie").setDescription("La catégorie").addChannelTypes(ChannelType.GuildCategory).setRequired(true))
            .addBooleanOption((opt) => opt.setName("retirer").setDescription("Retirer de la liste blanche au lieu d'ajouter")),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("backup")
        .setDescription("Sauvegardes de la structure du serveur")
        .addSubcommand((sub) => sub.setName("creer").setDescription("Créer une sauvegarde maintenant").addStringOption((opt) => opt.setName("nom").setDescription("Nom de la sauvegarde")))
        .addSubcommand((sub) => sub.setName("liste").setDescription("Lister les sauvegardes"))
        .addSubcommand((sub) =>
          sub
            .setName("charger")
            .setDescription("Restaurer une sauvegarde (recrée ce qui manque, retire ce qui ne correspond pas)")
            .addStringOption((opt) => opt.setName("id").setDescription("ID de la sauvegarde").setRequired(true)),
        )
        .addSubcommand((sub) =>
          sub
            .setName("supprimer")
            .setDescription("Supprimer une sauvegarde")
            .addStringOption((opt) => opt.setName("id").setDescription("ID de la sauvegarde").setRequired(true)),
        )
        .addSubcommand((sub) => sub.setName("effacer").setDescription("Supprimer toutes les sauvegardes")),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("panic")
        .setDescription("Mode panique — verrouillage total en cas de vague de destructions")
        .addSubcommand((sub) =>
          sub
            .setName("setup")
            .setDescription("Configurer le mode panique (vide = afficher la config actuelle)")
            .addBooleanOption((opt) => opt.setName("actif").setDescription("Activer/désactiver la détection de vague"))
            .addIntegerOption((opt) => opt.setName("seuil_auteurs").setDescription("Nombre d'auteurs distincts déclenchant le mode panique").setMinValue(2))
            .addIntegerOption((opt) => opt.setName("fenetre_secondes").setDescription("Fenêtre d'observation en secondes").setMinValue(5))
            .addBooleanOption((opt) => opt.setName("verrouillage_auto").setDescription("Verrouiller automatiquement le serveur à l'activation"))
            .addBooleanOption((opt) => opt.setName("restauration_auto").setDescription("Restaurer automatiquement la dernière sauvegarde"))
            .addRoleOption((opt) => opt.setName("role_alerte").setDescription("Rôle à ping quand le mode panique se déclenche")),
        )
        .addSubcommand((sub) => sub.setName("activer").setDescription("Déclencher le mode panique manuellement (propriétaire/extra owner uniquement)"))
        .addSubcommand((sub) => sub.setName("fin").setDescription("Lever le mode panique (propriétaire/extra owner uniquement)"))
        .addSubcommand((sub) => sub.setName("statut").setDescription("Voir l'état du mode panique")),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("avertissements")
        .setDescription("Escalade automatique par points d'avertissement")
        .addSubcommand((sub) => sub.setName("actif").setDescription("Activer/désactiver l'escalade automatique").addBooleanOption((opt) => opt.setName("actif").setDescription("Activer/désactiver").setRequired(true)))
        .addSubcommand((sub) =>
          sub
            .setName("ajouter-seuil")
            .setDescription("Ajouter (ou remplacer) un seuil d'escalade")
            .addIntegerOption((opt) => opt.setName("points").setDescription("Points cumulés déclenchant l'action").setRequired(true).setMinValue(1))
            .addStringOption((opt) =>
              opt
                .setName("action")
                .setDescription("Action à ce seuil")
                .setRequired(true)
                .addChoices({ name: "Timeout", value: "TIMEOUT" }, { name: "Expulsion", value: "KICK" }, { name: "Bannissement", value: "BAN" }),
            )
            .addIntegerOption((opt) => opt.setName("timeout_minutes").setDescription("Durée du timeout, si action = Timeout").setMinValue(1)),
        )
        .addSubcommand((sub) =>
          sub
            .setName("retirer-seuil")
            .setDescription("Retirer un seuil d'escalade")
            .addIntegerOption((opt) => opt.setName("points").setDescription("Points du seuil à retirer").setRequired(true)),
        )
        .addSubcommand((sub) => sub.setName("liste-seuils").setDescription("Voir les seuils d'escalade configurés")),
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
    if (group === "anti-nuke") {
      if (sub === "setup") return executeAntiNukeSetup(interaction);
      if (sub === "whitelist-utilisateur") return executeAntiNukeWhitelistUtilisateur(interaction);
      if (sub === "whitelist-categorie") return executeAntiNukeWhitelistCategorie(interaction);
    }
    if (group === "backup") {
      if (sub === "creer") return executeBackupCreer(interaction);
      if (sub === "liste") return executeBackupListe(interaction);
      if (sub === "charger") return executeBackupCharger(interaction);
      if (sub === "supprimer") return executeBackupSupprimer(interaction);
      if (sub === "effacer") return executeBackupEffacer(interaction);
    }
    if (group === "panic") {
      if (sub === "setup") return executePanicSetup(interaction);
      if (sub === "activer") return executePanicActiver(interaction);
      if (sub === "fin") return executePanicFin(interaction);
      if (sub === "statut") return executePanicStatut(interaction);
    }
    if (group === "avertissements") {
      if (sub === "actif") return executeWarnEscalationActif(interaction);
      if (sub === "ajouter-seuil") return executeWarnEscalationAjouter(interaction);
      if (sub === "retirer-seuil") return executeWarnEscalationRetirer(interaction);
      if (sub === "liste-seuils") return executeWarnEscalationListe(interaction);
    }
  },
};
