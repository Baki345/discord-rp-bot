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
import { executeSalonAfk } from "./salon-afk.js";
import { executeSalonSecurite } from "./salon-securite.js";
import {
  executePorteEntreeAvatar,
  executePorteEntreeAge,
  executePorteEntreeBotVerifie,
  executePorteEntreeBotAjout,
  executePorteEntreeInvitation,
  executePorteEntreeSuspect,
  executePorteEntreePseudo,
} from "./porte-entree.js";

const ACTION_CHOICES = [
  { name: "Journal seulement", value: "LOG" },
  { name: "Timeout", value: "TIMEOUT" },
  { name: "Expulsion", value: "KICK" },
  { name: "Bannissement", value: "BAN" },
  { name: "Désactiver ce filtre", value: "OFF" },
] as const;

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
    )
    .addSubcommand((sub) =>
      sub
        .setName("salon-afk")
        .setDescription("Définir le salon vocal anti-AFK (laisser vide pour désactiver)")
        .addChannelOption((opt) => opt.setName("salon").setDescription("Salon vocal anti-AFK").addChannelTypes(ChannelType.GuildVoice).setRequired(false))
        .addIntegerOption((opt) => opt.setName("minutes").setDescription("Délai d'inactivité en minutes (défaut 20)").setRequired(false).setMinValue(1)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("salon-securite")
        .setDescription("Router une catégorie de logs sécurité vers un salon")
        .addStringOption((opt) =>
          opt
            .setName("categorie")
            .setDescription("Catégorie de logs")
            .setRequired(true)
            .addChoices(
              { name: "Généraux", value: "GENERAL" },
              { name: "Modération", value: "MODERATION" },
              { name: "Appels", value: "APPEALS" },
              { name: "Auto-modération", value: "AUTOMOD" },
              { name: "Anti-nuke", value: "ANTI_NUKE" },
              { name: "Vérification", value: "VERIFICATION" },
              { name: "Porte d'entrée", value: "JOIN_GATE" },
              { name: "Raid d'arrivées", value: "JOIN_RAID" },
              { name: "Mode panique", value: "PANIC" },
            ),
        )
        .addChannelOption((opt) =>
          opt
            .setName("salon")
            .setDescription("Salon cible (laisser vide pour retirer le routage)")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("porte-entree")
        .setDescription("Filtres appliqués à l'arrivée d'un membre")
        .addSubcommand((sub) =>
          sub
            .setName("avatar")
            .setDescription("Filtre : pas de photo de profil")
            .addStringOption((opt) => opt.setName("action").setDescription("Action").setRequired(true).addChoices(...ACTION_CHOICES)),
        )
        .addSubcommand((sub) =>
          sub
            .setName("age")
            .setDescription("Filtre : âge minimum du compte")
            .addStringOption((opt) => opt.setName("action").setDescription("Action").setRequired(true).addChoices(...ACTION_CHOICES))
            .addIntegerOption((opt) => opt.setName("minutes").setDescription("Âge minimum en minutes").setMinValue(0))
            .addBooleanOption((opt) => opt.setName("mp").setDescription("Indiquer l'âge minimum en message privé")),
        )
        .addSubcommand((sub) =>
          sub
            .setName("bot-verifie")
            .setDescription("Filtre : bots non vérifiés par Discord")
            .addStringOption((opt) => opt.setName("action").setDescription("Action").setRequired(true).addChoices(...ACTION_CHOICES)),
        )
        .addSubcommand((sub) =>
          sub
            .setName("bot-ajout")
            .setDescription("Filtre : ajout de bot par du staff non autorisé")
            .addStringOption((opt) => opt.setName("action").setDescription("Action").setRequired(true).addChoices(...ACTION_CHOICES))
            .addStringOption((opt) => opt.setName("ids_autorises").setDescription("IDs Discord autorisés à ajouter des bots, séparés par des virgules")),
        )
        .addSubcommand((sub) =>
          sub
            .setName("invitation")
            .setDescription("Filtre : pseudo contenant une invitation Discord")
            .addStringOption((opt) => opt.setName("action").setDescription("Action").setRequired(true).addChoices(...ACTION_CHOICES)),
        )
        .addSubcommand((sub) =>
          sub
            .setName("suspect")
            .setDescription("Filtre : compte jugé suspect (heuristique)")
            .addStringOption((opt) => opt.setName("action").setDescription("Action").setRequired(true).addChoices(...ACTION_CHOICES)),
        )
        .addSubcommand((sub) =>
          sub
            .setName("pseudo")
            .setDescription("Filtre : pseudo sur liste noire (motifs séparés par des virgules, * = joker)")
            .addStringOption((opt) => opt.setName("action").setDescription("Action").setRequired(true).addChoices(...ACTION_CHOICES))
            .addStringOption((opt) => opt.setName("motifs").setDescription("Motifs, séparés par des virgules (ex: raid*, *xXx*)")),
        ),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();
    if (!group) {
      if (sub === "setup") return executeSetup(interaction);
      if (sub === "salon-logs") return executeSalonLogs(interaction);
      if (sub === "role-permission") return executeRolePermission(interaction);
      if (sub === "salon-afk") return executeSalonAfk(interaction);
      if (sub === "salon-securite") return executeSalonSecurite(interaction);
    }
    if (group === "porte-entree") {
      if (sub === "avatar") return executePorteEntreeAvatar(interaction);
      if (sub === "age") return executePorteEntreeAge(interaction);
      if (sub === "bot-verifie") return executePorteEntreeBotVerifie(interaction);
      if (sub === "bot-ajout") return executePorteEntreeBotAjout(interaction);
      if (sub === "invitation") return executePorteEntreeInvitation(interaction);
      if (sub === "suspect") return executePorteEntreeSuspect(interaction);
      if (sub === "pseudo") return executePorteEntreePseudo(interaction);
    }
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
