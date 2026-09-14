import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** Unlike tickets' canActOnTicketCategory, there is no support-role fallback here — an empty reviewerRoleIds means "Discord admin only", the safest default for something as sensitive as staff recruitment. */
export function canReviewApplicationCategory(actor: ActorContext, actorRoleIds: string[], reviewerRoleIds: unknown): boolean {
  if (actor.isDiscordGuildAdmin) return true;
  return asStringArray(reviewerRoleIds).some((id) => actorRoleIds.includes(id));
}

const ApplicationQuestion = z.object({
  id: z.string(),
  type: z.enum(["SHORT_TEXT", "PARAGRAPH", "USER", "ROLE", "CHANNEL", "SELECT", "FILE"]),
  label: z.string().min(1).max(200),
  required: z.boolean().default(false),
});

export const CreateApplicationCategoryInput = z.object({
  guildId: z.string(),
  name: z.string().min(1).max(100),
  questions: z.array(ApplicationQuestion).default([]),
  reviewerRoleIds: z.array(z.string()).default([]),
  resultChannelId: z.string().nullable().optional(),
});
export type CreateApplicationCategoryInput = z.input<typeof CreateApplicationCategoryInput>;

export async function createApplicationCategory(actor: ActorContext, input: CreateApplicationCategoryInput) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");
  const data = CreateApplicationCategoryInput.parse(input);

  const category = await prisma.applicationCategory.create({ data });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "application.create_category",
    targetType: "ApplicationCategory",
    targetId: category.id,
    metadata: { name: data.name },
  });

  return category;
}

/** Genuinely partial — same fields-all-optional-with-no-default discipline as ticket.service's UpdateTicketCategoryInput, for the same reason (a default would silently wipe questions/reviewerRoleIds on every edit that didn't resend them). */
export const UpdateApplicationCategoryInput = z.object({
  name: z.string().min(1).max(100).optional(),
  questions: z.array(ApplicationQuestion).optional(),
  reviewerRoleIds: z.array(z.string()).optional(),
  resultChannelId: z.string().nullable().optional(),
});
export type UpdateApplicationCategoryInput = z.infer<typeof UpdateApplicationCategoryInput>;

export async function updateApplicationCategory(actor: ActorContext, guildId: string, categoryId: string, input: UpdateApplicationCategoryInput) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");
  const data = UpdateApplicationCategoryInput.parse(input);

  const category = await prisma.applicationCategory.update({ where: { id: categoryId }, data });

  await writeAuditLog({
    guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "application.update_category",
    targetType: "ApplicationCategory",
    targetId: category.id,
  });

  return category;
}

export async function deleteApplicationCategory(actor: ActorContext, guildId: string, categoryId: string) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");
  await prisma.applicationCategory.delete({ where: { id: categoryId } });

  await writeAuditLog({
    guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "application.delete_category",
    targetType: "ApplicationCategory",
    targetId: categoryId,
  });
}

export async function listApplicationCategories(guildId: string) {
  return prisma.applicationCategory.findMany({ where: { guildId }, orderBy: { createdAt: "asc" } });
}

export async function getApplicationCategory(categoryId: string) {
  const category = await prisma.applicationCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new ServiceError("NOT_FOUND", { categoryId }, "Cette catégorie de candidature n'existe pas.");
  return category;
}

export const SubmitApplicationInput = z.object({
  guildId: z.string(),
  categoryId: z.string(),
  answers: z.record(z.string(), z.string()),
});
export type SubmitApplicationInput = z.input<typeof SubmitApplicationInput>;

export async function submitApplication(actor: ActorContext, input: SubmitApplicationInput) {
  const data = SubmitApplicationInput.parse(input);
  const category = await getApplicationCategory(data.categoryId);

  const questions = Array.isArray(category.questions) ? (category.questions as { id: string; required?: boolean }[]) : [];
  const missing = questions.filter((q) => q.required && !data.answers[q.id]?.trim());
  if (missing.length > 0) {
    throw new ServiceError("VALIDATION_ERROR", { missing: missing.map((q) => q.id) }, "Une ou plusieurs questions obligatoires n'ont pas de réponse.");
  }

  const application = await prisma.application.create({
    data: {
      guildId: data.guildId,
      categoryId: data.categoryId,
      applicantDiscordId: actor.discordUserId,
      answers: data.answers as never,
    },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: "DISCORD_USER",
    actorDiscordId: actor.discordUserId,
    action: "application.submit",
    targetType: "Application",
    targetId: application.id,
    metadata: { categoryId: data.categoryId },
  });

  return application;
}

export async function getApplication(applicationId: string) {
  const application = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!application) throw new ServiceError("NOT_FOUND", { applicationId }, "Cette candidature n'existe pas.");
  return application;
}

export async function listPendingApplications(guildId: string) {
  return prisma.application.findMany({ where: { guildId, status: "PENDING" }, orderBy: { createdAt: "asc" } });
}

export async function listApplicationHistory(guildId: string, limit = 50) {
  return prisma.application.findMany({ where: { guildId, status: { not: "PENDING" } }, orderBy: { reviewedAt: "desc" }, take: limit });
}

async function reviewApplication(
  actor: ActorContext,
  actorRoleIds: string[],
  applicationId: string,
  status: "ACCEPTED" | "REJECTED",
  reviewNote?: string,
) {
  const application = await getApplication(applicationId);
  if (application.status !== "PENDING") throw new ServiceError("VALIDATION_ERROR", {}, "Cette candidature a déjà été traitée.");

  const category = await getApplicationCategory(application.categoryId);
  if (!canReviewApplicationCategory(actor, actorRoleIds, category.reviewerRoleIds)) throw new ServiceError("FORBIDDEN");

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: { status, reviewedByDiscordId: actor.discordUserId, reviewedAt: new Date(), reviewNote },
  });

  await writeAuditLog({
    guildId: application.guildId,
    actorType: "DISCORD_USER",
    actorDiscordId: actor.discordUserId,
    action: status === "ACCEPTED" ? "application.accept" : "application.reject",
    targetType: "Application",
    targetId: applicationId,
    metadata: { reviewNote },
  });

  return updated;
}

export async function acceptApplication(actor: ActorContext, actorRoleIds: string[], applicationId: string, reviewNote?: string) {
  return reviewApplication(actor, actorRoleIds, applicationId, "ACCEPTED", reviewNote);
}

export async function rejectApplication(actor: ActorContext, actorRoleIds: string[], applicationId: string, reviewNote?: string) {
  return reviewApplication(actor, actorRoleIds, applicationId, "REJECTED", reviewNote);
}
