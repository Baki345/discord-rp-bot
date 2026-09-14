import { prisma, type ActorType, type Prisma } from "@discord-rp/database";

export interface WriteAuditLogInput {
  guildId: string;
  actorType: ActorType;
  actorDiscordId?: string;
  actorCharacterId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Every mutating service call writes one of these — it's the append-only
 * record the dashboard's Logs page reads, and (from M9 on) what gets
 * mirrored to a guild's configured Discord channel. Never throws: a
 * failed audit write must never roll back or block the action it's
 * describing, only be visible in server logs for operators to notice.
 */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        guildId: input.guildId,
        actorType: input.actorType,
        actorDiscordId: input.actorDiscordId,
        actorCharacterId: input.actorCharacterId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    console.error("writeAuditLog failed (action was NOT rolled back):", input.action, e);
  }
}
