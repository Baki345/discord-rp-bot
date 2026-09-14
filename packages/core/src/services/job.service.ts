import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { assertWithinQuota } from "../quota/quota-service.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { hasPermission, requirePermission } from "../permissions/check-permission.js";
import { getCharacter } from "./character.service.js";
import { assertSessionActiveIfRequired } from "./session.service.js";

export const CreateJobInput = z.object({
  guildId: z.string(),
  key: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9_-]+$/, "lettres minuscules, chiffres, - et _ uniquement"),
  name: z.string().min(2).max(56),
  description: z.string().max(300).optional(),
  isIllegal: z.boolean().optional(),
});
export type CreateJobInput = z.infer<typeof CreateJobInput>;

/** Every new job gets one starting grade (rank 0, unpaid) so it's immediately joinable — a guild admin can add more grades later via the dashboard. */
export async function createJob(actor: ActorContext, input: CreateJobInput) {
  const data = CreateJobInput.parse(input);
  requirePermission(actor, "MANAGE_JOBS");
  await assertWithinQuota(data.guildId, "jobs");

  const existing = await prisma.job.findUnique({ where: { guildId_key: { guildId: data.guildId, key: data.key } } });
  if (existing) throw new ServiceError("ALREADY_EXISTS", { key: data.key });

  const job = await prisma.job.create({
    data: {
      guildId: data.guildId,
      key: data.key,
      name: data.name,
      description: data.description,
      isIllegal: data.isIllegal ?? false,
      grades: { create: { name: "Employé", rank: 0, salaryCents: 0 } },
    },
    include: { grades: true },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "job.create",
    targetType: "Job",
    targetId: job.id,
    metadata: { name: job.name },
  });

  return job;
}

export async function listJobs(guildId: string) {
  return prisma.job.findMany({ where: { guildId }, include: { grades: { orderBy: { rank: "asc" } } }, orderBy: { name: "asc" } });
}

export async function getJob(guildId: string, jobId: string) {
  const job = await prisma.job.findFirst({ where: { id: jobId, guildId }, include: { grades: { orderBy: { rank: "asc" } } } });
  if (!job) throw new ServiceError("NOT_FOUND", { jobId });
  return job;
}

export const JoinJobInput = z.object({
  guildId: z.string(),
  characterId: z.string(),
  jobId: z.string(),
});

/** Always joins at the job's lowest-rank grade — promotions happen separately (dashboard, later). */
export async function joinJob(actor: ActorContext, input: z.infer<typeof JoinJobInput>) {
  const data = JoinJobInput.parse(input);
  await assertSessionActiveIfRequired(data.guildId);
  const character = await getCharacter(data.guildId, data.characterId);
  if (actor.discordUserId !== character.discordUserId && !hasPermission(actor, "MANAGE_CHARACTERS")) {
    throw new ServiceError("FORBIDDEN");
  }
  const job = await getJob(data.guildId, data.jobId);
  const startingGrade = job.grades[0];
  if (!startingGrade) throw new ServiceError("NOT_FOUND", {}, "Ce métier n'a aucun grade configuré.");

  const membership = await prisma.characterJob.upsert({
    where: { characterId: character.id },
    update: { jobId: job.id, gradeId: startingGrade.id, hiredAt: new Date() },
    create: { guildId: data.guildId, characterId: character.id, jobId: job.id, gradeId: startingGrade.id },
    include: { job: true, grade: true },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: "job.join",
    targetType: "Job",
    targetId: job.id,
  });

  return membership;
}

export const LeaveJobInput = z.object({
  guildId: z.string(),
  characterId: z.string(),
});

export async function leaveJob(actor: ActorContext, input: z.infer<typeof LeaveJobInput>) {
  const data = LeaveJobInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  if (actor.discordUserId !== character.discordUserId && !hasPermission(actor, "MANAGE_CHARACTERS")) {
    throw new ServiceError("FORBIDDEN");
  }

  const membership = await prisma.characterJob.findUnique({ where: { characterId: character.id } });
  if (!membership) throw new ServiceError("NOT_FOUND", {}, "Ce personnage n'a pas de métier.");

  await prisma.characterJob.delete({ where: { characterId: character.id } });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: "job.leave",
    targetType: "Job",
    targetId: membership.jobId,
  });
}

export async function getCharacterJob(characterId: string) {
  return prisma.characterJob.findUnique({ where: { characterId }, include: { job: true, grade: true } });
}
