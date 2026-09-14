import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { assertWithinQuota } from "../quota/quota-service.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { requirePermission } from "../permissions/check-permission.js";

export const CreatePlaceInput = z.object({
  guildId: z.string(),
  name: z.string().min(2).max(56),
  description: z.string().max(300).optional(),
  imageUrl: z.string().optional(),
  category: z.string().max(32).optional(),
  ownerCharacterId: z.string().optional(),
  companyId: z.string().optional(),
  requiredLicenseKey: z.string().optional(),
  discordChannelId: z.string().optional(),
});
export type CreatePlaceInput = z.infer<typeof CreatePlaceInput>;

/** Places are catalog data (a bank, a hospital, a player's house) — managed by an admin or a MANAGE_PLACES RPRole, optionally owned by a character or company. */
export async function createPlace(actor: ActorContext, input: CreatePlaceInput) {
  const data = CreatePlaceInput.parse(input);
  requirePermission(actor, "MANAGE_PLACES");
  await assertWithinQuota(data.guildId, "places");

  const existing = await prisma.place.findUnique({ where: { guildId_name: { guildId: data.guildId, name: data.name } } });
  if (existing) throw new ServiceError("ALREADY_EXISTS", { name: data.name });

  const place = await prisma.place.create({
    data: {
      guildId: data.guildId,
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      category: data.category,
      ownerCharacterId: data.ownerCharacterId,
      companyId: data.companyId,
      requiredLicenseKey: data.requiredLicenseKey,
      discordChannelId: data.discordChannelId,
    },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "place.create",
    targetType: "Place",
    targetId: place.id,
    metadata: { name: place.name },
  });

  return place;
}

export async function listPlaces(guildId: string) {
  return prisma.place.findMany({
    where: { guildId },
    include: { ownerCharacter: true, company: true },
    orderBy: { name: "asc" },
  });
}

export async function getPlace(guildId: string, placeId: string) {
  const place = await prisma.place.findFirst({
    where: { id: placeId, guildId },
    include: { ownerCharacter: true, company: true },
  });
  if (!place) throw new ServiceError("NOT_FOUND", { placeId });
  return place;
}

/**
 * Enforces a place's optional Discord-channel gate for "you must be here"
 * actions (activities, crafting, drugs...) — a no-op when the place has no
 * discordChannelId configured, so admins aren't forced to wire up channels
 * for every place immediately.
 */
export function assertAtPlace(place: { discordChannelId: string | null; name: string }, channelId: string | null | undefined) {
  if (place.discordChannelId && place.discordChannelId !== channelId) {
    throw new ServiceError("VALIDATION_ERROR", {}, `Tu dois être dans le salon dédié à "${place.name}" pour faire ça.`);
  }
}

export const DeletePlaceInput = z.object({ guildId: z.string(), placeId: z.string() });

export async function deletePlace(actor: ActorContext, input: z.infer<typeof DeletePlaceInput>) {
  const data = DeletePlaceInput.parse(input);
  requirePermission(actor, "MANAGE_PLACES");
  const place = await getPlace(data.guildId, data.placeId);

  await prisma.place.delete({ where: { id: place.id } });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "place.delete",
    targetType: "Place",
    targetId: place.id,
    metadata: { name: place.name },
  });
}
