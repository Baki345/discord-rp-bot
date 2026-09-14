import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { hasPermission } from "../permissions/check-permission.js";
import { getCharacter } from "./character.service.js";
import { getVehicle } from "./vehicle.service.js";
import { getPlace } from "./place.service.js";

function auditActorType(actor: ActorContext) {
  return actor.source === "discord-bot" ? ("DISCORD_USER" as const) : ("DASHBOARD_USER" as const);
}

// ============================= VEHICLE KEYS =============================

export const GrantVehicleKeyInput = z.object({
  guildId: z.string(),
  vehicleId: z.string(),
  characterId: z.string(),
});
export type GrantVehicleKeyInput = z.infer<typeof GrantVehicleKeyInput>;

/** Only the vehicle's owner (or a MANAGE_VEHICLES RPRole) can hand out spare keys — a key-holder can't re-grant to someone else. */
export async function grantVehicleKey(actor: ActorContext, input: GrantVehicleKeyInput) {
  const data = GrantVehicleKeyInput.parse(input);
  const vehicle = await getVehicle(data.guildId, data.vehicleId);
  const isOwner = vehicle.ownerCharacter?.discordUserId === actor.discordUserId;
  if (!isOwner && !hasPermission(actor, "MANAGE_VEHICLES")) throw new ServiceError("FORBIDDEN");

  const recipient = await getCharacter(data.guildId, data.characterId);
  const key = await prisma.vehicleKey.upsert({
    where: { vehicleId_characterId: { vehicleId: vehicle.id, characterId: recipient.id } },
    update: {},
    create: { guildId: data.guildId, vehicleId: vehicle.id, characterId: recipient.id },
    include: { character: true },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: auditActorType(actor),
    actorDiscordId: actor.discordUserId,
    action: "key.vehicle_grant",
    targetType: "Vehicle",
    targetId: vehicle.id,
    metadata: { plate: vehicle.plate, recipientCharacterId: recipient.id },
  });

  return key;
}

export const RevokeVehicleKeyInput = GrantVehicleKeyInput;
export type RevokeVehicleKeyInput = z.infer<typeof RevokeVehicleKeyInput>;

export async function revokeVehicleKey(actor: ActorContext, input: RevokeVehicleKeyInput) {
  const data = RevokeVehicleKeyInput.parse(input);
  const vehicle = await getVehicle(data.guildId, data.vehicleId);
  const isOwner = vehicle.ownerCharacter?.discordUserId === actor.discordUserId;
  if (!isOwner && !hasPermission(actor, "MANAGE_VEHICLES")) throw new ServiceError("FORBIDDEN");

  const existing = await prisma.vehicleKey.findUnique({
    where: { vehicleId_characterId: { vehicleId: vehicle.id, characterId: data.characterId } },
  });
  if (!existing) throw new ServiceError("NOT_FOUND", {}, "Ce personnage n'a pas de clé pour ce véhicule.");
  await prisma.vehicleKey.delete({ where: { id: existing.id } });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: auditActorType(actor),
    actorDiscordId: actor.discordUserId,
    action: "key.vehicle_revoke",
    targetType: "Vehicle",
    targetId: vehicle.id,
    metadata: { plate: vehicle.plate, recipientCharacterId: data.characterId },
  });
}

export async function listVehicleKeyHolders(guildId: string, vehicleId: string) {
  return prisma.vehicleKey.findMany({ where: { guildId, vehicleId }, include: { character: true } });
}

/** Owner OR key-holder — the gate every "use this vehicle" action should check, distinct from ownership (only the owner can sell). */
export async function hasVehicleAccess(guildId: string, vehicleId: string, characterId: string): Promise<boolean> {
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, guildId } });
  if (!vehicle) return false;
  if (vehicle.ownerCharacterId === characterId) return true;
  const key = await prisma.vehicleKey.findUnique({ where: { vehicleId_characterId: { vehicleId, characterId } } });
  return key !== null;
}

/** Vehicles this character owns OR holds a spare key for — used by the /vehicule utiliser autocomplete. */
export async function listAccessibleVehicles(guildId: string, characterId: string) {
  const [owned, keyed] = await Promise.all([
    prisma.vehicle.findMany({ where: { guildId, ownerCharacterId: characterId }, include: { model: true } }),
    prisma.vehicleKey.findMany({
      where: { guildId, characterId },
      include: { vehicle: { include: { model: true } } },
    }),
  ]);
  const byId = new Map(owned.map((v) => [v.id, v]));
  for (const { vehicle } of keyed) byId.set(vehicle.id, vehicle);
  return [...byId.values()];
}

// ============================= PLACE KEYS =============================

export const GrantPlaceKeyInput = z.object({
  guildId: z.string(),
  placeId: z.string(),
  characterId: z.string(),
});
export type GrantPlaceKeyInput = z.infer<typeof GrantPlaceKeyInput>;

export async function grantPlaceKey(actor: ActorContext, input: GrantPlaceKeyInput) {
  const data = GrantPlaceKeyInput.parse(input);
  const place = await getPlace(data.guildId, data.placeId);
  const isOwner = place.ownerCharacter?.discordUserId === actor.discordUserId;
  if (!isOwner && !hasPermission(actor, "MANAGE_PLACES")) throw new ServiceError("FORBIDDEN");

  const recipient = await getCharacter(data.guildId, data.characterId);
  const key = await prisma.placeKey.upsert({
    where: { placeId_characterId: { placeId: place.id, characterId: recipient.id } },
    update: {},
    create: { guildId: data.guildId, placeId: place.id, characterId: recipient.id },
    include: { character: true },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: auditActorType(actor),
    actorDiscordId: actor.discordUserId,
    action: "key.place_grant",
    targetType: "Place",
    targetId: place.id,
    metadata: { name: place.name, recipientCharacterId: recipient.id },
  });

  return key;
}

export const RevokePlaceKeyInput = GrantPlaceKeyInput;
export type RevokePlaceKeyInput = z.infer<typeof RevokePlaceKeyInput>;

export async function revokePlaceKey(actor: ActorContext, input: RevokePlaceKeyInput) {
  const data = RevokePlaceKeyInput.parse(input);
  const place = await getPlace(data.guildId, data.placeId);
  const isOwner = place.ownerCharacter?.discordUserId === actor.discordUserId;
  if (!isOwner && !hasPermission(actor, "MANAGE_PLACES")) throw new ServiceError("FORBIDDEN");

  const existing = await prisma.placeKey.findUnique({
    where: { placeId_characterId: { placeId: place.id, characterId: data.characterId } },
  });
  if (!existing) throw new ServiceError("NOT_FOUND", {}, "Ce personnage n'a pas de clé pour ce lieu.");
  await prisma.placeKey.delete({ where: { id: existing.id } });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: auditActorType(actor),
    actorDiscordId: actor.discordUserId,
    action: "key.place_revoke",
    targetType: "Place",
    targetId: place.id,
    metadata: { name: place.name, recipientCharacterId: data.characterId },
  });
}

export async function listPlaceKeyHolders(guildId: string, placeId: string) {
  return prisma.placeKey.findMany({ where: { guildId, placeId }, include: { character: true } });
}

/**
 * Owner OR key-holder OR MANAGE_PLACES — a place with no owner at all
 * (ownerCharacterId and companyId both null) is public, always accessible.
 */
export async function hasPlaceAccess(guildId: string, placeId: string, characterId: string): Promise<boolean> {
  const place = await prisma.place.findFirst({ where: { id: placeId, guildId } });
  if (!place) return false;

  if (place.requiredLicenseKey) {
    const license = await prisma.license.findUnique({ where: { guildId_key: { guildId, key: place.requiredLicenseKey } } });
    if (license) {
      const held = await prisma.characterLicense.findUnique({
        where: { characterId_licenseId: { characterId, licenseId: license.id } },
      });
      if (!held) return false;
    }
  }

  if (!place.ownerCharacterId && !place.companyId) return true;
  if (place.ownerCharacterId === characterId) return true;
  const key = await prisma.placeKey.findUnique({ where: { placeId_characterId: { placeId, characterId } } });
  return key !== null;
}

/** Places this character can enter: public ones, ones they own, and ones they hold a key for — used by /lieu entrer's autocomplete. */
export async function listAccessiblePlaces(guildId: string, characterId: string) {
  const [pub, owned, keyed] = await Promise.all([
    prisma.place.findMany({ where: { guildId, ownerCharacterId: null, companyId: null } }),
    prisma.place.findMany({ where: { guildId, ownerCharacterId: characterId } }),
    prisma.placeKey.findMany({ where: { guildId, characterId }, include: { place: true } }),
  ]);
  const byId = new Map(pub.map((p) => [p.id, p]));
  for (const p of owned) byId.set(p.id, p);
  for (const { place } of keyed) byId.set(place.id, place);
  return [...byId.values()];
}
