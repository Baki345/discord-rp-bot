import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { requirePermission } from "../permissions/check-permission.js";
import { getCharacter } from "./character.service.js";

export const CreateLicenseInput = z.object({
  guildId: z.string(),
  key: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9_-]+$/, "lettres minuscules, chiffres, - et _ uniquement"),
  name: z.string().min(2).max(56),
  passScorePct: z.number().int().min(1).max(100).optional(),
});
export type CreateLicenseInput = z.infer<typeof CreateLicenseInput>;

export async function createLicense(actor: ActorContext, input: CreateLicenseInput) {
  const data = CreateLicenseInput.parse(input);
  requirePermission(actor, "MANAGE_LICENSES");

  const existing = await prisma.license.findUnique({ where: { guildId_key: { guildId: data.guildId, key: data.key } } });
  if (existing) throw new ServiceError("ALREADY_EXISTS", { key: data.key });

  const license = await prisma.license.create({
    data: { guildId: data.guildId, key: data.key, name: data.name, passScorePct: data.passScorePct ?? 80 },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "license.create",
    targetType: "License",
    targetId: license.id,
    metadata: { name: license.name },
  });

  return license;
}

export const AddQuestionInput = z.object({
  guildId: z.string(),
  licenseId: z.string(),
  question: z.string().min(3).max(200),
  choices: z.array(z.string().min(1).max(80)).min(2).max(4),
  correctIndex: z.number().int().min(0),
});
export type AddQuestionInput = z.infer<typeof AddQuestionInput>;

export async function addQuestion(actor: ActorContext, input: AddQuestionInput) {
  const data = AddQuestionInput.parse(input);
  requirePermission(actor, "MANAGE_LICENSES");
  if (data.correctIndex >= data.choices.length) {
    throw new ServiceError("VALIDATION_ERROR", {}, "L'index de la bonne réponse dépasse le nombre de choix.");
  }

  const license = await getLicense(data.guildId, data.licenseId);
  const question = await prisma.licenseQuestion.create({
    data: {
      licenseId: license.id,
      question: data.question,
      choices: data.choices,
      correctIndex: data.correctIndex,
    },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "license.question_add",
    targetType: "License",
    targetId: license.id,
  });

  return question;
}

export async function listLicenses(guildId: string) {
  return prisma.license.findMany({ where: { guildId }, include: { questions: true }, orderBy: { name: "asc" } });
}

export async function getLicense(guildId: string, licenseId: string) {
  const license = await prisma.license.findFirst({
    where: { id: licenseId, guildId },
    include: { questions: { orderBy: { createdAt: "asc" } } },
  });
  if (!license) throw new ServiceError("NOT_FOUND", { licenseId });
  return license;
}

export async function listCharacterLicenses(characterId: string) {
  return prisma.characterLicense.findMany({ where: { characterId }, include: { license: true } });
}

export async function hasLicense(characterId: string, guildId: string, licenseKey: string): Promise<boolean> {
  const license = await prisma.license.findUnique({ where: { guildId_key: { guildId, key: licenseKey } } });
  if (!license) return false;
  const held = await prisma.characterLicense.findUnique({
    where: { characterId_licenseId: { characterId, licenseId: license.id } },
  });
  return held !== null;
}

export const GradeExamInput = z.object({
  guildId: z.string(),
  characterId: z.string(),
  licenseId: z.string(),
  answers: z.array(z.number().int().min(0)),
});
export type GradeExamInput = z.infer<typeof GradeExamInput>;

/**
 * Grades a full set of answers at once — apps/bot collects them across a
 * short-lived, in-memory button flow (see commands/permis/examSessions.ts)
 * rather than this service knowing anything about a "session".
 */
export async function gradeExam(actor: ActorContext, input: GradeExamInput) {
  const data = GradeExamInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  if (actor.discordUserId !== character.discordUserId) throw new ServiceError("FORBIDDEN");

  const license = await getLicense(data.guildId, data.licenseId);
  if (license.questions.length === 0) {
    throw new ServiceError("VALIDATION_ERROR", {}, "Ce permis n'a aucune question configurée.");
  }

  const correctCount = license.questions.filter((q, i) => data.answers[i] === q.correctIndex).length;
  const scorePct = Math.round((correctCount / license.questions.length) * 100);
  const passed = scorePct >= license.passScorePct;

  if (passed) {
    await prisma.characterLicense.upsert({
      where: { characterId_licenseId: { characterId: character.id, licenseId: license.id } },
      update: {},
      create: { guildId: data.guildId, characterId: character.id, licenseId: license.id },
    });
  }

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: passed ? "license.exam_pass" : "license.exam_fail",
    targetType: "License",
    targetId: license.id,
    metadata: { scorePct, correctCount, totalCount: license.questions.length },
  });

  return { scorePct, passed, correctCount, totalCount: license.questions.length };
}
