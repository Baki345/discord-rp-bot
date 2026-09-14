import { z } from "zod";
import { prisma, type Prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";

const ChannelSnapshot = z.object({
  id: z.string(),
  name: z.string(),
  type: z.number(),
  parentId: z.string().nullable(),
  position: z.number(),
  overwrites: z.array(z.object({ id: z.string(), type: z.number(), allow: z.string(), deny: z.string() })),
});
export type ChannelSnapshot = z.infer<typeof ChannelSnapshot>;

const RoleSnapshot = z.object({
  id: z.string(),
  name: z.string(),
  color: z.number(),
  permissions: z.string(),
  position: z.number(),
  hoist: z.boolean(),
  mentionable: z.boolean(),
});
export type RoleSnapshot = z.infer<typeof RoleSnapshot>;

/** Structure-only — channels/roles/permissions. Deliberately excludes messages and member role assignments (spec boundary: "ne restaure pas ... qui avait quel rôle"). */
export const GuildStructureSnapshot = z.object({
  channels: z.array(ChannelSnapshot),
  roles: z.array(RoleSnapshot),
});
export type GuildStructureSnapshot = z.infer<typeof GuildStructureSnapshot>;

export async function createBackup(actor: ActorContext, input: { guildId: string; label?: string; snapshot: GuildStructureSnapshot }) {
  const snapshot = GuildStructureSnapshot.parse(input.snapshot);

  const backup = await prisma.securityBackup.create({
    data: { guildId: input.guildId, label: input.label, snapshot: snapshot as Prisma.InputJsonValue },
  });

  await writeAuditLog({
    guildId: input.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "backup.create",
    targetType: "SecurityBackup",
    targetId: backup.id,
    metadata: { label: input.label, channelCount: snapshot.channels.length, roleCount: snapshot.roles.length },
  });

  return backup;
}

export async function listBackups(guildId: string) {
  return prisma.securityBackup.findMany({ where: { guildId }, orderBy: { createdAt: "desc" } });
}

export async function getLatestBackup(guildId: string) {
  return prisma.securityBackup.findFirst({ where: { guildId }, orderBy: { createdAt: "desc" } });
}

export async function getBackup(guildId: string, backupId: string) {
  const backup = await prisma.securityBackup.findFirst({ where: { id: backupId, guildId } });
  if (!backup) throw new ServiceError("NOT_FOUND", { backupId });
  return backup;
}

export async function deleteBackup(actor: ActorContext, input: { guildId: string; backupId: string }) {
  const backup = await getBackup(input.guildId, input.backupId);
  await prisma.securityBackup.delete({ where: { id: backup.id } });

  await writeAuditLog({
    guildId: input.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "backup.delete",
    targetType: "SecurityBackup",
    targetId: backup.id,
  });
}

export async function clearBackups(actor: ActorContext, guildId: string) {
  const { count } = await prisma.securityBackup.deleteMany({ where: { guildId } });

  await writeAuditLog({
    guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "backup.clear",
    metadata: { count },
  });

  return count;
}

export interface RestorePlan {
  channelsToDelete: string[];
  channelsToRecreate: ChannelSnapshot[];
  rolesToDelete: string[];
  rolesToRecreate: RoleSnapshot[];
}

/**
 * Pure — no I/O. "Retire ce qui ne correspond pas, recrée ce qui a été
 * supprimé": an existence diff by id against the snapshot, not a full
 * property-level restore (a channel/role that still exists but was
 * merely renamed is left alone — only additions and deletions relative
 * to the snapshot are corrected).
 */
export function planRestore(current: { channelIds: string[]; roleIds: string[] }, snapshot: GuildStructureSnapshot): RestorePlan {
  const snapshotChannelIds = new Set(snapshot.channels.map((c) => c.id));
  const snapshotRoleIds = new Set(snapshot.roles.map((r) => r.id));
  const currentChannelIds = new Set(current.channelIds);
  const currentRoleIds = new Set(current.roleIds);

  return {
    channelsToDelete: current.channelIds.filter((id) => !snapshotChannelIds.has(id)),
    channelsToRecreate: snapshot.channels.filter((c) => !currentChannelIds.has(c.id)),
    rolesToDelete: current.roleIds.filter((id) => !snapshotRoleIds.has(id)),
    rolesToRecreate: snapshot.roles.filter((r) => !currentRoleIds.has(r.id)),
  };
}

export async function recordRestore(actor: ActorContext, input: { guildId: string; backupId: string; plan: RestorePlan }) {
  await writeAuditLog({
    guildId: input.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "backup.restore",
    targetType: "SecurityBackup",
    targetId: input.backupId,
    metadata: {
      channelsDeleted: input.plan.channelsToDelete.length,
      channelsRecreated: input.plan.channelsToRecreate.length,
      rolesDeleted: input.plan.rolesToDelete.length,
      rolesRecreated: input.plan.rolesToRecreate.length,
    },
  });
}
