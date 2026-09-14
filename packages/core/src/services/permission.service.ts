import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { PERMISSION_FLAGS, type PermissionFlag } from "../permissions/permission-flags.js";

export const CreateRPRoleInput = z.object({
  guildId: z.string(),
  key: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9_-]+$/, "lettres minuscules, chiffres, - et _ uniquement"),
  name: z.string().min(2).max(56),
  color: z.string().max(16).optional(),
  permissions: z.array(z.enum(PERMISSION_FLAGS)).default([]),
});
export type CreateRPRoleInput = z.infer<typeof CreateRPRoleInput>;

/**
 * RPRole management is intentionally Discord-guild-admin-only, never
 * delegable via an RPRole flag itself — a permission that can grant
 * permissions would let a delegated role escalate its own reach.
 */
export async function createRPRole(actor: ActorContext, input: CreateRPRoleInput) {
  const data = CreateRPRoleInput.parse(input);
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");

  const existing = await prisma.rPRole.findUnique({ where: { guildId_key: { guildId: data.guildId, key: data.key } } });
  if (existing) throw new ServiceError("ALREADY_EXISTS", { key: data.key });

  const role = await prisma.rPRole.create({
    data: { guildId: data.guildId, key: data.key, name: data.name, color: data.color, permissions: data.permissions },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "permission.role_create",
    targetType: "RPRole",
    targetId: role.id,
    metadata: { name: role.name, permissions: data.permissions },
  });

  return role;
}

export async function listRPRoles(guildId: string) {
  return prisma.rPRole.findMany({ where: { guildId }, orderBy: { name: "asc" } });
}

export async function deleteRPRole(actor: ActorContext, guildId: string, roleId: string) {
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");
  const role = await prisma.rPRole.findFirst({ where: { id: roleId, guildId } });
  if (!role) throw new ServiceError("NOT_FOUND", { roleId });

  await prisma.rPRole.delete({ where: { id: role.id } });

  await writeAuditLog({
    guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "permission.role_delete",
    targetType: "RPRole",
    targetId: role.id,
    metadata: { name: role.name },
  });
}

export const AssignRoleInput = z.object({
  guildId: z.string(),
  discordUserId: z.string(),
  roleId: z.string(),
});
export type AssignRoleInput = z.infer<typeof AssignRoleInput>;

export async function assignRole(actor: ActorContext, input: AssignRoleInput) {
  const data = AssignRoleInput.parse(input);
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");

  const role = await prisma.rPRole.findFirst({ where: { id: data.roleId, guildId: data.guildId } });
  if (!role) throw new ServiceError("NOT_FOUND", { roleId: data.roleId });

  const assignment = await prisma.guildMemberRPRole.upsert({
    where: { guildId_discordUserId_roleId: { guildId: data.guildId, discordUserId: data.discordUserId, roleId: role.id } },
    update: {},
    create: { guildId: data.guildId, discordUserId: data.discordUserId, roleId: role.id },
    include: { role: true },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "permission.role_assign",
    targetType: "GuildMemberRPRole",
    metadata: { targetDiscordUserId: data.discordUserId, role: role.name },
  });

  return assignment;
}

export async function unassignRole(actor: ActorContext, input: AssignRoleInput) {
  const data = AssignRoleInput.parse(input);
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");

  const assignment = await prisma.guildMemberRPRole.findUnique({
    where: { guildId_discordUserId_roleId: { guildId: data.guildId, discordUserId: data.discordUserId, roleId: data.roleId } },
    include: { role: true },
  });
  if (!assignment) throw new ServiceError("NOT_FOUND");

  await prisma.guildMemberRPRole.delete({ where: { id: assignment.id } });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "permission.role_unassign",
    targetType: "GuildMemberRPRole",
    metadata: { targetDiscordUserId: data.discordUserId, role: assignment.role.name },
  });
}

export async function listMemberRoleAssignments(guildId: string) {
  return prisma.guildMemberRPRole.findMany({ where: { guildId }, include: { role: true }, orderBy: { assignedAt: "desc" } });
}

/** The flattened permission-flag list resolveActorContext (bot + dashboard) attaches to ActorContext.rpPermissions. */
export async function getMemberPermissions(guildId: string, discordUserId: string): Promise<PermissionFlag[]> {
  const assignments = await prisma.guildMemberRPRole.findMany({ where: { guildId, discordUserId }, include: { role: true } });
  const flags = new Set<PermissionFlag>();
  for (const assignment of assignments) {
    for (const flag of assignment.role.permissions as string[]) {
      if ((PERMISSION_FLAGS as readonly string[]).includes(flag)) flags.add(flag as PermissionFlag);
    }
  }
  return [...flags];
}
