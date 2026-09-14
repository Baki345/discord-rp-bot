import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";

/**
 * Buttons are link-style only (a URL, no customId) — a saved template has
 * no bot logic behind it, so any non-link button would do nothing when
 * clicked and Discord would show "This interaction failed". Select menus
 * have the same problem and aren't offered at all. Classic embeds only,
 * no Components V2 (see Phase 4 plan design decisions).
 */
const MessageButton = z.object({
  label: z.string().min(1).max(80),
  url: z.string().url(),
  emoji: z.string().max(32).optional(),
});

const MessageEmbed = z.object({
  title: z.string().max(256).optional(),
  description: z.string().max(4096).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  footerText: z.string().max(2048).optional(),
  imageUrl: z.string().url().optional(),
});

export const MessageTemplateContent = z.object({
  content: z.string().max(2000).optional(),
  embeds: z.array(MessageEmbed).max(10).default([]),
  buttonRows: z.array(z.array(MessageButton).max(5)).max(5).default([]),
});
export type MessageTemplateContent = z.infer<typeof MessageTemplateContent>;

export const SaveMessageTemplateInput = z.object({
  guildId: z.string(),
  name: z.string().min(1).max(100),
  content: MessageTemplateContent,
});
export type SaveMessageTemplateInput = z.input<typeof SaveMessageTemplateInput>;

export async function saveMessageTemplate(actor: ActorContext, input: SaveMessageTemplateInput) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");
  const data = SaveMessageTemplateInput.parse(input);
  const content = MessageTemplateContent.parse(data.content);

  const template = await prisma.messageTemplate.upsert({
    where: { guildId_name: { guildId: data.guildId, name: data.name } },
    update: { contentJson: content as never },
    create: { guildId: data.guildId, name: data.name, contentJson: content as never },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "message_template.save",
    targetType: "MessageTemplate",
    targetId: template.id,
    metadata: { name: data.name },
  });

  return template;
}

export async function deleteMessageTemplate(actor: ActorContext, guildId: string, name: string) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");
  await prisma.messageTemplate.delete({ where: { guildId_name: { guildId, name } } });

  await writeAuditLog({
    guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "message_template.delete",
    targetType: "MessageTemplate",
    metadata: { name },
  });
}

export async function listMessageTemplates(guildId: string) {
  return prisma.messageTemplate.findMany({ where: { guildId }, orderBy: { name: "asc" } });
}

export async function getMessageTemplate(guildId: string, name: string) {
  const template = await prisma.messageTemplate.findUnique({ where: { guildId_name: { guildId, name } } });
  if (!template) throw new ServiceError("NOT_FOUND", { name }, "Ce modèle de message n'existe pas.");
  return template;
}
