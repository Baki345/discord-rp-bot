import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import {
  openTicket,
  claimTicket,
  unclaimTicket,
  closeTicket,
  transferTicket,
  getTicketCategory,
  getTicketByChannelId,
  listTicketCategories,
} from "@discord-rp/core";
import { prisma } from "@discord-rp/database";
import type { ButtonHandler, SelectMenuHandler } from "../client.js";
import { resolveActorContext } from "../context/resolveActorContext.js";
import { createTicketChannel } from "./ticketChannel.js";

export function buildTicketControlRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticket:claim").setLabel("Prendre en charge").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("ticket:unclaim").setLabel("Relâcher").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:transfer").setLabel("Transférer").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:close").setLabel("Fermer").setStyle(ButtonStyle.Danger),
  );
}

async function resolveActorRoleIds(interaction: ButtonInteraction | StringSelectMenuInteraction): Promise<string[]> {
  const member = await interaction.guild!.members.fetch(interaction.user.id);
  return member.roles.cache.filter((r) => r.id !== interaction.guild!.id).map((r) => r.id);
}

export const ticketOpenSelectHandler: SelectMenuHandler = {
  customIdPrefix: "ticket:open:",
  async execute(interaction: StringSelectMenuInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const categoryId = interaction.values[0]!;
    const category = await getTicketCategory(categoryId);

    const index = (await prisma.ticket.count({ where: { guildId: interaction.guildId! } })) + 1;
    const channel = await createTicketChannel(interaction.guild!, category, interaction.user.id, index);

    const actor = await resolveActorContext(interaction);
    await openTicket(actor, { guildId: interaction.guildId!, categoryId, channelId: channel.id, formAnswers: {} });

    const embed = new EmbedBuilder()
      .setTitle(`Ticket — ${category.name}`)
      .setDescription(`Ouvert par <@${interaction.user.id}>. Le staff a été notifié.`)
      .setColor(0x7c3aed);
    await channel.send({ embeds: [embed], components: [buildTicketControlRow()] });

    await interaction.editReply(`✅ Ticket ouvert : <#${channel.id}>`);
  },
};

export const ticketClaimHandler: ButtonHandler = {
  customIdPrefix: "ticket:claim",
  async execute(interaction: ButtonInteraction) {
    const ticket = await getTicketByChannelId(interaction.channelId);
    if (!ticket) return void (await interaction.reply({ content: "❌ Ce salon n'est pas un ticket.", ephemeral: true }));

    const actor = await resolveActorContext(interaction);
    const roleIds = await resolveActorRoleIds(interaction);
    await claimTicket(actor, roleIds, ticket.id);
    await interaction.reply(`🙋 Ticket pris en charge par <@${interaction.user.id}>.`);
  },
};

export const ticketUnclaimHandler: ButtonHandler = {
  customIdPrefix: "ticket:unclaim",
  async execute(interaction: ButtonInteraction) {
    const ticket = await getTicketByChannelId(interaction.channelId);
    if (!ticket) return void (await interaction.reply({ content: "❌ Ce salon n'est pas un ticket.", ephemeral: true }));

    const actor = await resolveActorContext(interaction);
    const roleIds = await resolveActorRoleIds(interaction);
    await unclaimTicket(actor, roleIds, ticket.id);
    await interaction.reply(`↩️ Ticket relâché par <@${interaction.user.id}>.`);
  },
};

export const ticketCloseHandler: ButtonHandler = {
  customIdPrefix: "ticket:close",
  async execute(interaction: ButtonInteraction) {
    const ticket = await getTicketByChannelId(interaction.channelId);
    if (!ticket) return void (await interaction.reply({ content: "❌ Ce salon n'est pas un ticket.", ephemeral: true }));

    const actor = await resolveActorContext(interaction);
    const roleIds = await resolveActorRoleIds(interaction);
    await closeTicket(actor, roleIds, ticket.id);
    await interaction.reply(`🔒 Ticket fermé par <@${interaction.user.id}>. Ce salon sera archivé.`);
  },
};

export const ticketTransferButtonHandler: ButtonHandler = {
  customIdPrefix: "ticket:transfer",
  async execute(interaction: ButtonInteraction) {
    const ticket = await getTicketByChannelId(interaction.channelId);
    if (!ticket) return void (await interaction.reply({ content: "❌ Ce salon n'est pas un ticket.", ephemeral: true }));

    const categories = (await listTicketCategories(interaction.guildId!)).filter((c) => c.id !== ticket.categoryId);
    if (categories.length === 0) {
      await interaction.reply({ content: "❌ Aucune autre catégorie disponible.", ephemeral: true });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(`ticket:transfer-select:${ticket.id}`)
      .setPlaceholder("Nouvelle catégorie")
      .addOptions(categories.slice(0, 25).map((c) => ({ label: c.name, value: c.id, emoji: c.emoji ?? undefined })));

    await interaction.reply({
      content: "Choisis la catégorie de destination :",
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
      ephemeral: true,
    });
  },
};

export const ticketTransferSelectHandler: SelectMenuHandler = {
  customIdPrefix: "ticket:transfer-select:",
  async execute(interaction: StringSelectMenuInteraction) {
    const ticketId = interaction.customId.split(":")[2]!;
    const newCategoryId = interaction.values[0]!;

    const actor = await resolveActorContext(interaction);
    const roleIds = await resolveActorRoleIds(interaction);
    await transferTicket(actor, roleIds, ticketId, newCategoryId);

    await interaction.update({ content: "✅ Ticket transféré.", components: [] });
  },
};
