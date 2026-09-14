import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { assertWithinQuota } from "../quota/quota-service.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { hasPermission } from "../permissions/check-permission.js";
import { getCharacter } from "./character.service.js";

function assertOwnerOrGuildAdmin(actor: ActorContext, ownerDiscordUserId: string) {
  if (actor.discordUserId !== ownerDiscordUserId && !hasPermission(actor, "MANAGE_COMPANIES")) {
    throw new ServiceError("FORBIDDEN");
  }
}

export const CreateCompanyInput = z.object({
  guildId: z.string(),
  ownerCharacterId: z.string(),
  name: z.string().min(2).max(56),
  description: z.string().max(300).optional(),
});
export type CreateCompanyInput = z.infer<typeof CreateCompanyInput>;

/** Every new company gets a treasury bank account and one starting employee grade ("Employé", rank 0) — the owner isn't auto-hired into it, ownership is tracked separately on Company.ownerCharacterId. */
export async function createCompany(actor: ActorContext, input: CreateCompanyInput) {
  const data = CreateCompanyInput.parse(input);
  const owner = await getCharacter(data.guildId, data.ownerCharacterId);
  assertOwnerOrGuildAdmin(actor, owner.discordUserId);
  await assertWithinQuota(data.guildId, "companies");

  const existing = await prisma.company.findUnique({ where: { guildId_name: { guildId: data.guildId, name: data.name } } });
  if (existing) throw new ServiceError("ALREADY_EXISTS", { name: data.name });

  const company = await prisma.$transaction(async (tx) => {
    const treasury = await tx.bankAccount.create({ data: { guildId: data.guildId, type: "COMPANY" } });
    const created = await tx.company.create({
      data: {
        guildId: data.guildId,
        name: data.name,
        description: data.description,
        ownerCharacterId: owner.id,
        treasuryAccountId: treasury.id,
        grades: { create: { name: "Employé", rank: 0, salaryCents: 0 } },
      },
      include: { grades: true },
    });
    // The treasury account references its company via companyId too (for
    // Company.bankAccounts's back-relation) — set once the company id exists.
    await tx.bankAccount.update({ where: { id: treasury.id }, data: { companyId: created.id } });
    return created;
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: owner.id,
    action: "company.create",
    targetType: "Company",
    targetId: company.id,
    metadata: { name: company.name },
  });

  return company;
}

export async function listCompanies(guildId: string) {
  return prisma.company.findMany({
    where: { guildId },
    include: { ownerCharacter: true, employees: true },
    orderBy: { name: "asc" },
  });
}

export async function getCompany(guildId: string, companyId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, guildId },
    include: { ownerCharacter: true, treasuryAccount: true, grades: { orderBy: { rank: "asc" } }, employees: { include: { character: true, grade: true } } },
  });
  if (!company) throw new ServiceError("NOT_FOUND", { companyId });
  return company;
}

export const SetLaunderingFrontInput = z.object({
  guildId: z.string(),
  companyId: z.string(),
  isLaunderingFront: z.boolean(),
});
export type SetLaunderingFrontInput = z.infer<typeof SetLaunderingFrontInput>;

/** Owner or MANAGE_COMPANIES only — marking a company as a laundering front is a deliberate, visible RP choice, not something an employee can flip. */
export async function setLaunderingFront(actor: ActorContext, input: SetLaunderingFrontInput) {
  const data = SetLaunderingFrontInput.parse(input);
  const company = await getCompany(data.guildId, data.companyId);
  assertOwnerOrGuildAdmin(actor, company.ownerCharacter.discordUserId);

  const updated = await prisma.company.update({
    where: { id: company.id },
    data: { isLaunderingFront: data.isLaunderingFront },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "company.set_laundering_front",
    targetType: "Company",
    targetId: company.id,
    metadata: { isLaunderingFront: data.isLaunderingFront },
  });

  return updated;
}

export const HireEmployeeInput = z.object({
  guildId: z.string(),
  companyId: z.string(),
  characterId: z.string(),
  gradeId: z.string().optional(),
});
export type HireEmployeeInput = z.infer<typeof HireEmployeeInput>;

export async function hireEmployee(actor: ActorContext, input: HireEmployeeInput) {
  const data = HireEmployeeInput.parse(input);
  const company = await getCompany(data.guildId, data.companyId);
  assertOwnerOrGuildAdmin(actor, company.ownerCharacter.discordUserId);

  const character = await getCharacter(data.guildId, data.characterId);
  const grade = data.gradeId ? company.grades.find((g) => g.id === data.gradeId) : company.grades[0];
  if (!grade) throw new ServiceError("NOT_FOUND", {}, "Grade introuvable dans cette entreprise.");

  const existing = await prisma.companyEmployee.findUnique({
    where: { companyId_characterId: { companyId: company.id, characterId: character.id } },
  });
  if (existing) throw new ServiceError("ALREADY_EXISTS", {}, "Ce personnage travaille déjà ici.");

  const employee = await prisma.companyEmployee.create({
    data: { guildId: data.guildId, companyId: company.id, characterId: character.id, gradeId: grade.id },
    include: { character: true, grade: true },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "company.hire",
    targetType: "Company",
    targetId: company.id,
    metadata: { characterId: character.id, grade: grade.name },
  });

  return employee;
}

export const FireEmployeeInput = z.object({
  guildId: z.string(),
  companyId: z.string(),
  characterId: z.string(),
});
export type FireEmployeeInput = z.infer<typeof FireEmployeeInput>;

export async function fireEmployee(actor: ActorContext, input: FireEmployeeInput) {
  const data = FireEmployeeInput.parse(input);
  const company = await getCompany(data.guildId, data.companyId);
  assertOwnerOrGuildAdmin(actor, company.ownerCharacter.discordUserId);

  const employee = await prisma.companyEmployee.findUnique({
    where: { companyId_characterId: { companyId: company.id, characterId: data.characterId } },
  });
  if (!employee) throw new ServiceError("NOT_FOUND", {}, "Ce personnage ne travaille pas ici.");

  await prisma.companyEmployee.delete({ where: { id: employee.id } });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "company.fire",
    targetType: "Company",
    targetId: company.id,
    metadata: { characterId: data.characterId },
  });
}
