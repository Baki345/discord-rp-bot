import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type Guild,
  type ModalSubmitInteraction,
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
  setTicketVoiceChannel,
  assertTicketLimitNotExceeded,
  ServiceError,
} from "@discord-rp/core";
import { prisma } from "@discord-rp/database";
import type { TicketCategory } from "@discord-rp/database";
import type { ButtonHandler, ModalHandler, SelectMenuHandler } from "../client.js";
import { resolveActorContext } from "../context/resolveActorContext.js";
import { createTicketChannel, applyTicketCategoryOverwrites, lockTicketChannel } from "./ticketChannel.js";

export function buildTicketControlRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticket:claim").setLabel("Prendre en charge").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("ticket:unclaim").setLabel("Relâcher").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:transfer").setLabel("Transférer").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:vc-request").setLabel("Salon vocal").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:close").setLabel("Fermer").setStyle(ButtonStyle.Danger),
  );
}

async function resolveActorRoleIds(interaction: ButtonInteraction | StringSelectMenuInteraction): Promise<string[]> {
  const member = await interaction.guild!.members.fetch(interaction.user.id);
  return member.roles.cache.filter((r) => r.id !== interaction.guild!.id).map((r) => r.id);
}

/**
 * Discord modals only support text-input components (no user/role/channel
 * pickers, no select menus) regardless of a question's configured `type` —
 * a real platform constraint, not a shortcut. USER/ROLE/CHANNEL/SELECT
 * questions are still asked, just answered as free text (e.g. a mention
 * or an ID typed by hand); FILE questions are answered by sending the
 * file as the ticket's first message, explained in the opening embed.
 * Modals also cap at 5 components, so only the first 5 questions apply.
 */
function buildTicketFormModal(category: TicketCategory): ModalBuilder | null {
  const questions = Array.isArray(category.formQuestions) ? (category.formQuestions as { id: string; type: string; label: string; required?: boolean }[]) : [];
  if (questions.length === 0) return null;

  const modal = new ModalBuilder().setCustomId(`ticket:open-form:${category.id}`).setTitle(category.name.slice(0, 45));
  for (const q of questions.slice(0, 5)) {
    const style = q.type === "PARAGRAPH" ? TextInputStyle.Paragraph : TextInputStyle.Short;
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId(q.id).setLabel(q.label.slice(0, 45)).setStyle(style).setRequired(q.required ?? false),
      ),
    );
  }
  return modal;
}

async function finalizeTicketOpen(
  guild: Guild,
  openerDiscordId: string,
  category: TicketCategory,
  formAnswers: Record<string, string>,
  actor: Awaited<ReturnType<typeof resolveActorContext>>,
): Promise<string> {
  const index = (await prisma.ticket.count({ where: { guildId: guild.id } })) + 1;
  const channel = await createTicketChannel(guild, category, openerDiscordId, index);

  await openTicket(actor, { guildId: guild.id, categoryId: category.id, channelId: channel.id, formAnswers });

  const embed = new EmbedBuilder()
    .setTitle(`Ticket — ${category.name}`)
    .setDescription(
      `Ouvert par <@${openerDiscordId}>. Le staff a été notifié.` +
        (Array.isArray(category.formQuestions) && (category.formQuestions as unknown[]).some((q) => (q as { type: string }).type === "FILE")
          ? "\n\nEnvoie le(s) fichier(s) demandé(s) directement dans ce salon."
          : ""),
    )
    .setColor(0x7c3aed);
  if (Object.keys(formAnswers).length > 0) {
    embed.addFields(
      Object.entries(formAnswers).map(([id, value]) => ({
        name: (Array.isArray(category.formQuestions) ? (category.formQuestions as { id: string; label: string }[]).find((q) => q.id === id)?.label : undefined) ?? id,
        value: value || "—",
      })),
    );
  }
  await channel.send({ embeds: [embed], components: [buildTicketControlRow()] });

  return channel.id;
}

export const ticketOpenSelectHandler: SelectMenuHandler = {
  customIdPrefix: "ticket:open:",
  async execute(interaction: StringSelectMenuInteraction) {
    const categoryId = interaction.values[0]!;
    const category = await getTicketCategory(categoryId);

    try {
      await assertTicketLimitNotExceeded(interaction.guildId!, categoryId, interaction.user.id);
    } catch (e) {
      const message = e instanceof ServiceError ? e.message : "Limite atteinte.";
      await interaction.reply({ content: `❌ ${message}`, ephemeral: true });
      return;
    }

    const modal = buildTicketFormModal(category);
    if (modal) {
      await interaction.showModal(modal);
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const actor = await resolveActorContext(interaction);
    const channelId = await finalizeTicketOpen(interaction.guild!, interaction.user.id, category, {}, actor);
    await interaction.editReply(`✅ Ticket ouvert : <#${channelId}>`);
  },
};

export const ticketOpenFormModalHandler: ModalHandler = {
  customIdPrefix: "ticket:open-form:",
  async execute(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const categoryId = interaction.customId.split(":")[2]!;
    const category = await getTicketCategory(categoryId);

    try {
      await assertTicketLimitNotExceeded(interaction.guildId!, categoryId, interaction.user.id);
    } catch (e) {
      const message = e instanceof ServiceError ? e.message : "Limite atteinte.";
      await interaction.editReply(`❌ ${message}`);
      return;
    }

    const questions = Array.isArray(category.formQuestions) ? (category.formQuestions as { id: string }[]) : [];
    const formAnswers: Record<string, string> = {};
    for (const q of questions.slice(0, 5)) {
      formAnswers[q.id] = interaction.fields.getTextInputValue(q.id);
    }

    const actor = await resolveActorContext(interaction);
    const channelId = await finalizeTicketOpen(interaction.guild!, interaction.user.id, category, formAnswers, actor);
    await interaction.editReply(`✅ Ticket ouvert : <#${channelId}>`);
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
    if (interaction.channel?.type === ChannelType.GuildText) {
      await lockTicketChannel(interaction.channel, ticket.openerDiscordId);
    }
    await interaction.reply(`🔒 Ticket fermé par <@${interaction.user.id}>.`);
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
    const ticket = await transferTicket(actor, roleIds, ticketId, newCategoryId);

    const newCategory = await getTicketCategory(newCategoryId);
    if (interaction.channel?.type === ChannelType.GuildText) {
      await applyTicketCategoryOverwrites(interaction.channel, newCategory, ticket.openerDiscordId);
    }

    await interaction.update({ content: "✅ Ticket transféré.", components: [] });
  },
};

function roleIdsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export const ticketVcRequestHandler: ButtonHandler = {
  customIdPrefix: "ticket:vc-request",
  async execute(interaction: ButtonInteraction) {
    const ticket = await getTicketByChannelId(interaction.channelId);
    if (!ticket) return void (await interaction.reply({ content: "❌ Ce salon n'est pas un ticket.", ephemeral: true }));
    if (ticket.voiceChannelId) {
      await interaction.reply({ content: `❌ Un salon vocal existe déjà : <#${ticket.voiceChannelId}>.`, ephemeral: true });
      return;
    }

    const category = await getTicketCategory(ticket.categoryId);
    const textChannel = interaction.channel;
    const parentId = textChannel && "parentId" in textChannel ? textChannel.parentId : null;

    const allowedIds = [ticket.openerDiscordId, ...(ticket.claimedByDiscordId ? [ticket.claimedByDiscordId] : []), ...roleIdsOf(category.vcRequestRoleIds)];

    const voiceChannel = await interaction.guild!.channels.create({
      name: `vocal-ticket-${interaction.channel && "name" in interaction.channel ? interaction.channel.name : ""}`,
      type: ChannelType.GuildVoice,
      parent: parentId ?? undefined,
      permissionOverwrites: [
        { id: interaction.guild!.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        ...allowedIds.map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] })),
      ],
      reason: "Demande de salon vocal liée à un ticket",
    });

    await setTicketVoiceChannel(ticket.id, voiceChannel.id);
    await interaction.reply(`🔊 Salon vocal créé : <#${voiceChannel.id}>`);
  },
};
