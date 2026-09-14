import { ChannelType, PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { createApplicationCategory, listPendingApplications } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { resolveActorContext } from "../../context/resolveActorContext.js";

async function executeCategorieCreer(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const actor = await resolveActorContext(interaction);

  const nom = interaction.options.getString("nom", true);
  const salonResultat = interaction.options.getChannel("salon-resultat") ?? undefined;
  const roleRevieweur = interaction.options.getRole("role-revieweur") ?? undefined;

  const category = await createApplicationCategory(actor, {
    guildId: interaction.guildId!,
    name: nom,
    resultChannelId: salonResultat?.id ?? null,
    reviewerRoleIds: roleRevieweur ? [roleRevieweur.id] : [],
  });

  await interaction.editReply(
    `✅ Catégorie de candidature **${category.name}** créée (id : \`${category.id}\`). Configure les questions depuis le dashboard.`,
  );
}

async function executeListe(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const pending = await listPendingApplications(interaction.guildId!);
  if (pending.length === 0) return void (await interaction.editReply("Aucune candidature en attente."));
  await interaction.editReply(`📋 **${pending.length} candidature(s) en attente** — voir le salon de résultats de chaque catégorie.`);
}

export const candidaturesCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("candidatures")
    .setDescription("Gérer les catégories de candidature (staff)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("categorie-creer")
        .setDescription("Créer une catégorie de candidature")
        .addStringOption((opt) => opt.setName("nom").setDescription("Nom (ex. Modérateur, Partenaire)").setRequired(true))
        .addChannelOption((opt) =>
          opt.setName("salon-resultat").setDescription("Salon où les candidatures apparaissent pour revue").setRequired(false).addChannelTypes(ChannelType.GuildText),
        )
        .addRoleOption((opt) => opt.setName("role-revieweur").setDescription("Rôle autorisé à accepter/refuser").setRequired(false)),
    )
    .addSubcommand((sub) => sub.setName("liste").setDescription("Voir le nombre de candidatures en attente")),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "categorie-creer") return executeCategorieCreer(interaction);
    if (sub === "liste") return executeListe(interaction);
  },
};
