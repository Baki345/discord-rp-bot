import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function hasAnyRole(actorRoleIds: string[], allowList: string[]): boolean {
  return allowList.some((id) => actorRoleIds.includes(id));
}

/**
 * Ticket staff permission model: Discord admin always can; otherwise an
 * empty `specificRoleIds` list falls back to "any support-role holder for
 * this category" rather than "nobody" — a category admin who never
 * bothered to narrow claimRoleIds/closeRoleIds still gets a usable
 * default. Exported because M36 (VC requests) and the bot's button
 * handlers both need the same check.
 */
export function canActOnTicketCategory(
  actor: ActorContext,
  actorRoleIds: string[],
  category: { supportRoleIds: unknown },
  specificRoleIds: unknown,
): boolean {
  if (actor.isDiscordGuildAdmin) return true;
  const specific = asStringArray(specificRoleIds);
  if (specific.length > 0) return hasAnyRole(actorRoleIds, specific);
  return hasAnyRole(actorRoleIds, asStringArray(category.supportRoleIds));
}

// --- panels ---

export const CreateTicketPanelInput = z.object({
  guildId: z.string(),
  channelId: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
});
export type CreateTicketPanelInput = z.infer<typeof CreateTicketPanelInput>;

export async function createTicketPanel(actor: ActorContext, input: CreateTicketPanelInput) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");
  const data = CreateTicketPanelInput.parse(input);

  const panel = await prisma.ticketPanel.create({ data });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "ticket.create_panel",
    targetType: "TicketPanel",
    targetId: panel.id,
    metadata: { title: data.title },
  });

  return panel;
}

/** Called by the bot right after it posts (or re-posts) the panel message — not an admin-gated action, just persisting the message id. */
export async function setTicketPanelMessageId(panelId: string, messageId: string) {
  return prisma.ticketPanel.update({ where: { id: panelId }, data: { messageId } });
}

export async function listTicketPanels(guildId: string) {
  return prisma.ticketPanel.findMany({ where: { guildId }, include: { categories: true }, orderBy: { createdAt: "asc" } });
}

export async function getTicketPanel(panelId: string) {
  return prisma.ticketPanel.findUnique({ where: { id: panelId }, include: { categories: true } });
}

// --- categories ---

const TicketFormQuestion = z.object({
  id: z.string(),
  type: z.enum(["SHORT_TEXT", "PARAGRAPH", "USER", "ROLE", "CHANNEL", "SELECT", "FILE"]),
  label: z.string().min(1).max(200),
  required: z.boolean().default(false),
});

export const CreateTicketCategoryInput = z.object({
  guildId: z.string(),
  panelId: z.string().nullable().optional(),
  name: z.string().min(1).max(100),
  emoji: z.string().max(32).nullable().optional(),
  discordCategoryId: z.string().nullable().optional(),
  supportRoleIds: z.array(z.string()).default([]),
  claimRoleIds: z.array(z.string()).default([]),
  closeRoleIds: z.array(z.string()).default([]),
  vcRequestRoleIds: z.array(z.string()).default([]),
  formQuestions: z.array(TicketFormQuestion).default([]),
  ticketLimitPerUser: z.number().int().min(1).nullable().optional(),
  autoCloseAfterMinutesInactive: z.number().int().min(1).nullable().optional(),
});
export type CreateTicketCategoryInput = z.input<typeof CreateTicketCategoryInput>;

export async function createTicketCategory(actor: ActorContext, input: CreateTicketCategoryInput) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");
  const data = CreateTicketCategoryInput.parse(input);

  const category = await prisma.ticketCategory.create({ data });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "ticket.create_category",
    targetType: "TicketCategory",
    targetId: category.id,
    metadata: { name: data.name },
  });

  return category;
}

/**
 * Genuinely partial — unlike CreateTicketCategoryInput, no field here
 * carries a zod `.default()`. A default would silently overwrite every
 * unspecified field (e.g. wipe formQuestions to []) on every edit, since
 * Prisma's `update({ data })` writes exactly the keys present in `data`.
 * Only keys the caller actually included in `input` are ever written.
 */
export const UpdateTicketCategoryInput = z.object({
  panelId: z.string().nullable().optional(),
  name: z.string().min(1).max(100).optional(),
  emoji: z.string().max(32).nullable().optional(),
  discordCategoryId: z.string().nullable().optional(),
  supportRoleIds: z.array(z.string()).optional(),
  claimRoleIds: z.array(z.string()).optional(),
  closeRoleIds: z.array(z.string()).optional(),
  vcRequestRoleIds: z.array(z.string()).optional(),
  formQuestions: z.array(TicketFormQuestion).optional(),
  ticketLimitPerUser: z.number().int().min(1).nullable().optional(),
  autoCloseAfterMinutesInactive: z.number().int().min(1).nullable().optional(),
});
export type UpdateTicketCategoryInput = z.infer<typeof UpdateTicketCategoryInput>;

export async function updateTicketCategory(actor: ActorContext, guildId: string, categoryId: string, input: UpdateTicketCategoryInput) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");
  const data = UpdateTicketCategoryInput.parse(input);

  const category = await prisma.ticketCategory.update({ where: { id: categoryId }, data });

  await writeAuditLog({
    guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "ticket.update_category",
    targetType: "TicketCategory",
    targetId: category.id,
  });

  return category;
}

export async function deleteTicketCategory(actor: ActorContext, guildId: string, categoryId: string) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");
  await prisma.ticketCategory.delete({ where: { id: categoryId } });

  await writeAuditLog({
    guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "ticket.delete_category",
    targetType: "TicketCategory",
    targetId: categoryId,
  });
}

export async function listTicketCategories(guildId: string) {
  return prisma.ticketCategory.findMany({ where: { guildId }, orderBy: { createdAt: "asc" } });
}

export async function getTicketCategory(categoryId: string) {
  const category = await prisma.ticketCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new ServiceError("NOT_FOUND", { categoryId }, "Cette catégorie de ticket n'existe pas.");
  return category;
}

// --- tickets ---

export const OpenTicketInput = z.object({
  guildId: z.string(),
  categoryId: z.string(),
  channelId: z.string(),
  formAnswers: z.record(z.string(), z.unknown()).default({}),
});
export type OpenTicketInput = z.input<typeof OpenTicketInput>;

/**
 * Persists the ticket row — the bot creates the actual Discord channel
 * BEFORE calling this (it needs the channel id), applying the category's
 * support-role overwrites itself (packages/core stays discord.js-free).
 */
export async function openTicket(actor: ActorContext, input: OpenTicketInput) {
  const data = OpenTicketInput.parse(input);

  const ticket = await prisma.ticket.create({
    data: {
      guildId: data.guildId,
      categoryId: data.categoryId,
      channelId: data.channelId,
      openerDiscordId: actor.discordUserId,
      formAnswers: data.formAnswers as never,
    },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: "DISCORD_USER",
    actorDiscordId: actor.discordUserId,
    action: "ticket.open",
    targetType: "Ticket",
    targetId: ticket.id,
    metadata: { categoryId: data.categoryId },
  });

  return ticket;
}

export async function getTicket(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new ServiceError("NOT_FOUND", { ticketId }, "Ce ticket n'existe pas.");
  return ticket;
}

export async function getTicketByChannelId(channelId: string) {
  return prisma.ticket.findUnique({ where: { channelId } });
}

export async function listOpenTickets(guildId: string) {
  return prisma.ticket.findMany({ where: { guildId, status: { not: "CLOSED" } }, orderBy: { createdAt: "desc" } });
}

export async function listTicketHistory(guildId: string, limit = 50) {
  return prisma.ticket.findMany({ where: { guildId, status: "CLOSED" }, orderBy: { closedAt: "desc" }, take: limit });
}

async function assertTicketAction(
  actor: ActorContext,
  actorRoleIds: string[],
  ticketId: string,
  specificRoleField: "claimRoleIds" | "closeRoleIds",
) {
  const ticket = await getTicket(ticketId);
  const category = await getTicketCategory(ticket.categoryId);
  if (!canActOnTicketCategory(actor, actorRoleIds, category, category[specificRoleField])) {
    throw new ServiceError("FORBIDDEN");
  }
  return ticket;
}

export async function claimTicket(actor: ActorContext, actorRoleIds: string[], ticketId: string) {
  const ticket = await assertTicketAction(actor, actorRoleIds, ticketId, "claimRoleIds");
  if (ticket.status === "CLOSED") throw new ServiceError("VALIDATION_ERROR", {}, "Ce ticket est déjà fermé.");

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "CLAIMED", claimedByDiscordId: actor.discordUserId },
  });

  await writeAuditLog({
    guildId: ticket.guildId,
    actorType: "DISCORD_USER",
    actorDiscordId: actor.discordUserId,
    action: "ticket.claim",
    targetType: "Ticket",
    targetId: ticketId,
  });

  return updated;
}

export async function unclaimTicket(actor: ActorContext, actorRoleIds: string[], ticketId: string) {
  const ticket = await assertTicketAction(actor, actorRoleIds, ticketId, "claimRoleIds");
  if (ticket.status === "CLOSED") throw new ServiceError("VALIDATION_ERROR", {}, "Ce ticket est déjà fermé.");

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "OPEN", claimedByDiscordId: null },
  });

  await writeAuditLog({
    guildId: ticket.guildId,
    actorType: "DISCORD_USER",
    actorDiscordId: actor.discordUserId,
    action: "ticket.unclaim",
    targetType: "Ticket",
    targetId: ticketId,
  });

  return updated;
}

export async function closeTicket(actor: ActorContext, actorRoleIds: string[], ticketId: string, reason?: string) {
  const ticket = await getTicket(ticketId);
  const category = await getTicketCategory(ticket.categoryId);
  const isOpener = actor.discordUserId === ticket.openerDiscordId;
  if (!isOpener && !canActOnTicketCategory(actor, actorRoleIds, category, category.closeRoleIds)) {
    throw new ServiceError("FORBIDDEN");
  }
  if (ticket.status === "CLOSED") throw new ServiceError("VALIDATION_ERROR", {}, "Ce ticket est déjà fermé.");

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "CLOSED", closedAt: new Date(), closedByDiscordId: actor.discordUserId },
  });

  await writeAuditLog({
    guildId: ticket.guildId,
    actorType: "DISCORD_USER",
    actorDiscordId: actor.discordUserId,
    action: "ticket.close",
    targetType: "Ticket",
    targetId: ticketId,
    metadata: { reason },
  });

  return updated;
}

export async function transferTicket(actor: ActorContext, actorRoleIds: string[], ticketId: string, newCategoryId: string) {
  const ticket = await assertTicketAction(actor, actorRoleIds, ticketId, "closeRoleIds");
  if (ticket.status === "CLOSED") throw new ServiceError("VALIDATION_ERROR", {}, "Ce ticket est déjà fermé.");
  await getTicketCategory(newCategoryId); // throws NOT_FOUND if invalid

  const updated = await prisma.ticket.update({ where: { id: ticketId }, data: { categoryId: newCategoryId } });

  await writeAuditLog({
    guildId: ticket.guildId,
    actorType: "DISCORD_USER",
    actorDiscordId: actor.discordUserId,
    action: "ticket.transfer",
    targetType: "Ticket",
    targetId: ticketId,
    metadata: { newCategoryId },
  });

  return updated;
}

/** Bumped by the bot on every new message in a ticket channel — read by M36's auto-close ticker. */
export async function touchTicketActivity(ticketId: string) {
  await prisma.ticket.update({ where: { id: ticketId }, data: { lastActivityAt: new Date() } }).catch(() => {});
}
