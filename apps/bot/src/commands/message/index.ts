import { ChannelType, PermissionFlagsBits, SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction, type TextChannel } from "discord.js";
import { getMessageTemplate, listMessageTemplates } from "@discord-rp/core";
import type { BotCommand } from "../../client.js";
import { buildMessagePayload } from "./messagePayload.js";

async function executeEnvoyer(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const nom = interaction.options.getString("nom", true);
  const salon = (interaction.options.getChannel("salon") ?? interaction.channel) as TextChannel;
  const viaWebhook = interaction.options.getBoolean("via-webhook") ?? false;

  const template = await getMessageTemplate(interaction.guildId!, nom).catch(() => null);
  if (!template) {
    await interaction.editReply("❌ Modèle introuvable.");
    return;
  }

  const content = template.contentJson as never as Parameters<typeof buildMessagePayload>[0];
  const payload = buildMessagePayload(content);

  if (viaWebhook) {
    const webhooks = await salon.fetchWebhooks().catch(() => null);
    const webhook =
      webhooks?.find((w) => w.owner?.id === interaction.client.user?.id) ??
      (await salon.createWebhook({ name: interaction.client.user!.username }).catch(() => null));
    if (!webhook) {
      await interaction.editReply("❌ Impossible de créer/trouver un webhook sur ce salon (permission manquante ?).");
      return;
    }
    await webhook.send(payload);
  } else {
    await salon.send(payload);
  }

  await interaction.editReply(`✅ Message envoyé dans <#${salon.id}>.`);
}

export const messageCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("message")
    .setDescription("Envoyer un message formaté préparé sur le dashboard")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("envoyer")
        .setDescription("Envoyer un modèle de message enregistré")
        .addStringOption((opt) => opt.setName("nom").setDescription("Le modèle").setRequired(true).setAutocomplete(true))
        .addChannelOption((opt) =>
          opt.setName("salon").setDescription("Salon de destination (par défaut : ce salon)").setRequired(false).addChannelTypes(ChannelType.GuildText),
        )
        .addBooleanOption((opt) => opt.setName("via-webhook").setDescription("Envoyer via un webhook (identité personnalisée) plutôt que comme le bot").setRequired(false)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "envoyer") return executeEnvoyer(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inGuild()) return;
    const search = String(interaction.options.getFocused()).toLowerCase();
    const templates = await listMessageTemplates(interaction.guildId!);
    const filtered = templates
      .filter((t) => t.name.toLowerCase().includes(search))
      .slice(0, 25)
      .map((t) => ({ name: t.name, value: t.name }));
    await interaction.respond(filtered);
  },
};
