import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import { createTicketPanel, listTicketPanels, createTicketCategory, listOpenTickets, getTicketPanel } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";
import { postOrUpdatePanel } from "../../tickets/ticketPanel.js";

async function executePanneauCreer(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const actor = await resolveActorContext(interaction);

  const channel = interaction.options.getChannel("salon", true);
  const titre = interaction.options.getString("titre", true);
  const description = interaction.options.getString("description") ?? undefined;

  const panel = await createTicketPanel(actor, { guildId: interaction.guildId!, channelId: channel.id, title: titre, description });
  await interaction.editReply(`✅ Panneau créé (id : \`${panel.id}\`). Utilise \`/ticket panneau publier\` pour le publier une fois ses catégories ajoutées.`);
}

async function executePanneauPublier(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const panelId = interaction.options.getString("panneau", true);
  const panel = await getTicketPanel(panelId);
  if (!panel) return void (await interaction.editReply("❌ Panneau introuvable."));

  const channel = (await interaction.guild!.channels.fetch(panel.channelId).catch(() => null)) as TextChannel | null;
  if (!channel) return void (await interaction.editReply("❌ Le salon configuré pour ce panneau n'existe plus."));

  await postOrUpdatePanel(channel, panel, panel.categories);
  await interaction.editReply(`✅ Panneau publié dans <#${channel.id}>.`);
}

async function executeCategorieCreer(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const actor = await resolveActorContext(interaction);

  const nom = interaction.options.getString("nom", true);
  const emoji = interaction.options.getString("emoji") ?? undefined;
  const panneauId = interaction.options.getString("panneau") ?? undefined;
  const categorieDiscord = interaction.options.getChannel("categorie-discord") ?? undefined;
  const roleSupport = interaction.options.getRole("role-support") ?? undefined;

  const category = await createTicketCategory(actor, {
    guildId: interaction.guildId!,
    panelId: panneauId ?? null,
    name: nom,
    emoji,
    discordCategoryId: categorieDiscord?.id ?? null,
    supportRoleIds: roleSupport ? [roleSupport.id] : [],
  });

  await interaction.editReply(
    `✅ Catégorie **${category.name}** créée. Configure les rôles de claim/close/VC et le formulaire d'ouverture depuis le dashboard.`,
  );
}

async function executeListe(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const tickets = await listOpenTickets(interaction.guildId!);
  if (tickets.length === 0) return void (await interaction.editReply("Aucun ticket ouvert actuellement."));

  const lines = tickets
    .slice(0, 25)
    .map((t) => `<#${t.channelId}> — ${t.status === "CLAIMED" ? `pris en charge par <@${t.claimedByDiscordId}>` : "en attente"}`);
  await interaction.editReply(`🎫 **${tickets.length} ticket(s) ouvert(s)**\n\n${lines.join("\n")}`);
}

export const ticketCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Système de tickets")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommandGroup((group) =>
      group
        .setName("panneau")
        .setDescription("Gérer les panneaux de tickets")
        .addSubcommand((sub) =>
          sub
            .setName("creer")
            .setDescription("Créer un nouveau panneau de tickets")
            .addChannelOption((opt) => opt.setName("salon").setDescription("Salon où publier le panneau").setRequired(true).addChannelTypes(ChannelType.GuildText))
            .addStringOption((opt) => opt.setName("titre").setDescription("Titre du panneau").setRequired(true))
            .addStringOption((opt) => opt.setName("description").setDescription("Description (optionnelle)").setRequired(false)),
        )
        .addSubcommand((sub) =>
          sub
            .setName("publier")
            .setDescription("Publier (ou republier) un panneau dans son salon")
            .addStringOption((opt) => opt.setName("panneau").setDescription("Le panneau").setRequired(true).setAutocomplete(true)),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("categorie")
        .setDescription("Gérer les catégories de tickets")
        .addSubcommand((sub) =>
          sub
            .setName("creer")
            .setDescription("Créer une catégorie de tickets")
            .addStringOption((opt) => opt.setName("nom").setDescription("Nom de la catégorie").setRequired(true))
            .addStringOption((opt) => opt.setName("emoji").setDescription("Emoji affiché dans le menu").setRequired(false))
            .addStringOption((opt) => opt.setName("panneau").setDescription("Panneau à laquelle la rattacher").setRequired(false).setAutocomplete(true))
            .addChannelOption((opt) =>
              opt.setName("categorie-discord").setDescription("Catégorie Discord où créer les salons de ticket").setRequired(false).addChannelTypes(ChannelType.GuildCategory),
            )
            .addRoleOption((opt) => opt.setName("role-support").setDescription("Rôle staff ajouté à chaque ticket de cette catégorie").setRequired(false)),
        ),
    )
    .addSubcommand((sub) => sub.setName("liste").setDescription("Lister les tickets actuellement ouverts")),

  async execute(interaction: ChatInputCommandInteraction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    if (group === "panneau" && sub === "creer") return executePanneauCreer(interaction);
    if (group === "panneau" && sub === "publier") return executePanneauPublier(interaction);
    if (group === "categorie" && sub === "creer") return executeCategorieCreer(interaction);
    if (sub === "liste") return executeListe(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    const focused = interaction.options.getFocused(true);
    if (focused.name !== "panneau") return;

    const search = String(focused.value).toLowerCase();
    const panels = await listTicketPanels(interaction.guildId!);
    const filtered = panels
      .filter((p) => p.title.toLowerCase().includes(search))
      .slice(0, 25)
      .map((p) => ({ name: `${p.title} (${p.categories.length} catégorie(s))`, value: p.id }));
    await interaction.respond(filtered);
  },
};
