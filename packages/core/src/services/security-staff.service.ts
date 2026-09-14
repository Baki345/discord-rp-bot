import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma, type SecurityStaffTier } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";

async function getGuildOwnerDiscordId(guildId: string): Promise<string | null> {
  const guild = await prisma.guild.findUnique({ where: { id: guildId }, select: { ownerDiscordId: true } });
  return guild?.ownerDiscordId ?? null;
}

/** The real Discord server owner — distinct from `isDiscordGuildAdmin`, which any admin-permissioned member also has. */
export async function isRealOwner(guildId: string, discordUserId: string): Promise<boolean> {
  return (await getGuildOwnerDiscordId(guildId)) === discordUserId;
}

export async function getStaffTier(guildId: string, discordUserId: string): Promise<SecurityStaffTier | null> {
  const row = await prisma.securityStaff.findUnique({ where: { guildId_discordUserId: { guildId, discordUserId } } });
  return row?.tier ?? null;
}

/** Extra owners and the real server owner cannot be actioned by anyone but the real owner. */
export async function isImmune(guildId: string, discordUserId: string): Promise<boolean> {
  if (await isRealOwner(guildId, discordUserId)) return true;
  return (await getStaffTier(guildId, discordUserId)) === "EXTRA_OWNER";
}

export async function listStaff(guildId: string) {
  return prisma.securityStaff.findMany({ where: { guildId }, orderBy: { addedAt: "asc" } });
}

export const AddStaffInput = z.object({ guildId: z.string(), discordUserId: z.string() });
export type AddStaffInput = z.infer<typeof AddStaffInput>;

/** Only the real owner can add an extra owner — extra owners cannot add more, per spec. */
export async function addExtraOwner(actor: ActorContext, input: AddStaffInput) {
  const data = AddStaffInput.parse(input);
  if (!(await isRealOwner(data.guildId, actor.discordUserId))) {
    throw new ServiceError("FORBIDDEN", {}, "Seul le propriétaire du serveur peut ajouter un extra owner.");
  }

  const row = await prisma.securityStaff.upsert({
    where: { guildId_discordUserId: { guildId: data.guildId, discordUserId: data.discordUserId } },
    update: { tier: "EXTRA_OWNER", addedByDiscordId: actor.discordUserId },
    create: { guildId: data.guildId, discordUserId: data.discordUserId, tier: "EXTRA_OWNER", addedByDiscordId: actor.discordUserId },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "security.add_extra_owner",
    targetType: "SecurityStaff",
    targetId: data.discordUserId,
  });

  return row;
}

/** The owner or an existing extra owner can add a trusted admin. */
export async function addTrustedAdmin(actor: ActorContext, input: AddStaffInput) {
  const data = AddStaffInput.parse(input);
  const allowed = (await isRealOwner(data.guildId, actor.discordUserId)) || (await getStaffTier(data.guildId, actor.discordUserId)) === "EXTRA_OWNER";
  if (!allowed) {
    throw new ServiceError("FORBIDDEN", {}, "Seuls le propriétaire ou un extra owner peuvent ajouter un trusted admin.");
  }

  const row = await prisma.securityStaff.upsert({
    where: { guildId_discordUserId: { guildId: data.guildId, discordUserId: data.discordUserId } },
    update: { tier: "TRUSTED_ADMIN", addedByDiscordId: actor.discordUserId },
    create: { guildId: data.guildId, discordUserId: data.discordUserId, tier: "TRUSTED_ADMIN", addedByDiscordId: actor.discordUserId },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "security.add_trusted_admin",
    targetType: "SecurityStaff",
    targetId: data.discordUserId,
  });

  return row;
}

export async function removeStaff(actor: ActorContext, input: AddStaffInput) {
  const data = AddStaffInput.parse(input);
  const existing = await prisma.securityStaff.findUnique({ where: { guildId_discordUserId: { guildId: data.guildId, discordUserId: data.discordUserId } } });
  if (!existing) throw new ServiceError("NOT_FOUND", { discordUserId: data.discordUserId });

  const actorIsOwner = await isRealOwner(data.guildId, actor.discordUserId);
  if (!actorIsOwner) {
    const actorTier = await getStaffTier(data.guildId, actor.discordUserId);
    if (actorTier !== "EXTRA_OWNER") throw new ServiceError("FORBIDDEN");
    if (existing.tier === "EXTRA_OWNER") {
      throw new ServiceError("FORBIDDEN", {}, "Seul le propriétaire peut retirer un extra owner.");
    }
  }

  await prisma.securityStaff.delete({ where: { id: existing.id } });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "security.remove_staff",
    targetType: "SecurityStaff",
    targetId: data.discordUserId,
    metadata: { tier: existing.tier },
  });
}

/**
 * Used by every moderation-style action (warn/ban/kick/timeout/quarantine/
 * lockdown) before it touches Discord — throws if the target is immune and
 * the actor isn't the real owner. The real owner can always act.
 */
export async function assertModerationAllowed(guildId: string, actorDiscordId: string, targetDiscordId: string): Promise<void> {
  if (actorDiscordId === targetDiscordId) return;
  if (await isRealOwner(guildId, actorDiscordId)) return;
  if (await isImmune(guildId, targetDiscordId)) {
    throw new ServiceError("FORBIDDEN", {}, "Ce membre est immunisé contre les actions de modération (extra owner ou propriétaire).");
  }
}

// ============================= RESCUE KEY =============================

const RESCUE_SECRET_BYTES = 24; // -> 32-char base64url string

function generateRescueSecret(): string {
  return randomBytes(RESCUE_SECRET_BYTES).toString("base64url");
}

/** Only the real owner can generate a rescue key. Regenerating replaces the previous (unused or used) one. Returns the raw secret — shown once, never stored. */
export async function generateRescueKey(actor: ActorContext, input: { guildId: string }): Promise<string> {
  if (!(await isRealOwner(input.guildId, actor.discordUserId))) {
    throw new ServiceError("FORBIDDEN", {}, "Seul le propriétaire du serveur peut générer une clé de secours.");
  }

  const secret = generateRescueSecret();
  const hash = await bcrypt.hash(secret, 10);

  await prisma.rescueKey.upsert({
    where: { guildId: input.guildId },
    update: { hash, generatedByDiscordId: actor.discordUserId, createdAt: new Date(), redeemedAt: null, redeemedByDiscordId: null },
    create: { guildId: input.guildId, hash, generatedByDiscordId: actor.discordUserId },
  });

  await writeAuditLog({
    guildId: input.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "security.rescue_key_generated",
    targetType: "RescueKey",
  });

  return secret;
}

export const RedeemRescueKeyInput = z.object({ guildId: z.string(), secret: z.string().min(1) });
export type RedeemRescueKeyInput = z.infer<typeof RedeemRescueKeyInput>;

/**
 * Anyone holding the raw secret can redeem it — that's the whole point of a
 * rescue key (it's meant to work even when the owner's own account is lost).
 * Possession of the secret IS the authentication; it grants EXTRA_OWNER to
 * whichever Discord account redeems it, exactly once.
 */
export async function redeemRescueKey(actor: ActorContext, input: RedeemRescueKeyInput) {
  const data = RedeemRescueKeyInput.parse(input);
  const row = await prisma.rescueKey.findUnique({ where: { guildId: data.guildId } });
  if (!row) throw new ServiceError("NOT_FOUND", {}, "Aucune clé de secours n'a été générée pour ce serveur.");
  if (row.redeemedAt) throw new ServiceError("VALIDATION_ERROR", {}, "Cette clé de secours a déjà été utilisée.");

  const valid = await bcrypt.compare(data.secret, row.hash);
  if (!valid) throw new ServiceError("FORBIDDEN", {}, "Clé de secours invalide.");

  await prisma.$transaction([
    prisma.rescueKey.update({ where: { id: row.id }, data: { redeemedAt: new Date(), redeemedByDiscordId: actor.discordUserId } }),
    prisma.securityStaff.upsert({
      where: { guildId_discordUserId: { guildId: data.guildId, discordUserId: actor.discordUserId } },
      update: { tier: "EXTRA_OWNER", addedByDiscordId: "rescue-key" },
      create: { guildId: data.guildId, discordUserId: actor.discordUserId, tier: "EXTRA_OWNER", addedByDiscordId: "rescue-key" },
    }),
  ]);

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "security.rescue_key_redeemed",
    targetType: "RescueKey",
  });
}
