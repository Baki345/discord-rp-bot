import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { assertWithinQuota } from "../quota/quota-service.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { getCharacter } from "./character.service.js";

export const CreateVehicleCategoryInput = z.object({
  guildId: z.string(),
  key: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9_-]+$/, "lettres minuscules, chiffres, - et _ uniquement"),
  name: z.string().min(2).max(56),
  basePriceCents: z.number().int().min(0).optional(),
});

export async function createVehicleCategory(actor: ActorContext, input: z.infer<typeof CreateVehicleCategoryInput>) {
  const data = CreateVehicleCategoryInput.parse(input);
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");

  const existing = await prisma.vehicleCategory.findUnique({ where: { guildId_key: { guildId: data.guildId, key: data.key } } });
  if (existing) throw new ServiceError("ALREADY_EXISTS", { key: data.key });

  return prisma.vehicleCategory.create({
    data: { guildId: data.guildId, key: data.key, name: data.name, basePriceCents: data.basePriceCents ?? 0 },
  });
}

export async function listVehicleCategories(guildId: string) {
  return prisma.vehicleCategory.findMany({ where: { guildId }, orderBy: { name: "asc" } });
}

export const CreateVehicleModelInput = z.object({
  guildId: z.string(),
  categoryId: z.string(),
  name: z.string().min(2).max(56),
  brand: z.string().max(56).optional(),
  priceCents: z.number().int().min(0),
  maxSpeed: z.number().int().min(0).optional(),
  seats: z.number().int().min(1).max(12).optional(),
  imageUrl: z.string().optional(),
});

export async function createVehicleModel(actor: ActorContext, input: z.infer<typeof CreateVehicleModelInput>) {
  const data = CreateVehicleModelInput.parse(input);
  if (!actor.isDiscordGuildAdmin) throw new ServiceError("FORBIDDEN");

  const category = await prisma.vehicleCategory.findFirst({ where: { id: data.categoryId, guildId: data.guildId } });
  if (!category) throw new ServiceError("NOT_FOUND", { categoryId: data.categoryId });

  const existing = await prisma.vehicleModel.findUnique({ where: { guildId_name: { guildId: data.guildId, name: data.name } } });
  if (existing) throw new ServiceError("ALREADY_EXISTS", { name: data.name });

  return prisma.vehicleModel.create({
    data: {
      guildId: data.guildId,
      categoryId: category.id,
      name: data.name,
      brand: data.brand,
      priceCents: data.priceCents,
      maxSpeed: data.maxSpeed,
      seats: data.seats ?? 4,
      imageUrl: data.imageUrl,
    },
  });
}

export async function listVehicleModels(guildId: string) {
  return prisma.vehicleModel.findMany({ where: { guildId }, include: { category: true }, orderBy: { name: "asc" } });
}

export const BuyVehicleInput = z.object({
  guildId: z.string(),
  characterId: z.string(),
  modelId: z.string(),
  plate: z.string().min(2).max(12),
  paymentMethod: z.enum(["cash", "bank"]),
});
export type BuyVehicleInput = z.infer<typeof BuyVehicleInput>;

export async function buyVehicle(actor: ActorContext, input: BuyVehicleInput) {
  const data = BuyVehicleInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  if (actor.discordUserId !== character.discordUserId && !actor.isDiscordGuildAdmin) {
    throw new ServiceError("FORBIDDEN");
  }
  await assertWithinQuota(data.guildId, "vehicles");

  const model = await prisma.vehicleModel.findFirst({ where: { id: data.modelId, guildId: data.guildId } });
  if (!model) throw new ServiceError("NOT_FOUND", { modelId: data.modelId });

  const plateTaken = await prisma.vehicle.findUnique({ where: { guildId_plate: { guildId: data.guildId, plate: data.plate } } });
  if (plateTaken) throw new ServiceError("ALREADY_EXISTS", { plate: data.plate }, "Cette plaque est déjà utilisée.");

  const vehicle = await prisma.$transaction(async (tx) => {
    if (data.paymentMethod === "cash") {
      if (character.cashCents < model.priceCents) throw new ServiceError("INSUFFICIENT_CASH", { have: character.cashCents, need: model.priceCents });
      await tx.character.update({ where: { id: character.id }, data: { cashCents: { decrement: model.priceCents } } });
    } else {
      const account = await tx.bankAccount.findFirst({ where: { characterId: character.id, type: "PERSONAL" } });
      if (!account || account.balanceCents < model.priceCents) throw new ServiceError("INSUFFICIENT_FUNDS", { need: model.priceCents });
      await tx.bankAccount.update({ where: { id: account.id }, data: { balanceCents: { decrement: model.priceCents } } });
    }

    const created = await tx.vehicle.create({
      data: { guildId: data.guildId, modelId: model.id, plate: data.plate, ownerCharacterId: character.id },
      include: { model: { include: { category: true } } },
    });

    await tx.transaction.create({
      data: {
        guildId: data.guildId,
        type: "VEHICLE_PURCHASE",
        amountCents: model.priceCents,
        fromCharacterId: character.id,
        reason: `Achat de ${model.name}`,
      },
    });

    return created;
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: "vehicle.buy",
    targetType: "Vehicle",
    targetId: vehicle.id,
    metadata: { model: model.name, plate: data.plate, priceCents: model.priceCents },
  });

  return vehicle;
}

export async function listOwnedVehicles(guildId: string, characterId: string) {
  return prisma.vehicle.findMany({ where: { guildId, ownerCharacterId: characterId }, include: { model: true } });
}

export async function getVehicle(guildId: string, vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, guildId }, include: { model: { include: { category: true } }, ownerCharacter: true } });
  if (!vehicle) throw new ServiceError("NOT_FOUND", { vehicleId });
  return vehicle;
}

export const SellVehicleInput = z.object({
  guildId: z.string(),
  vehicleId: z.string(),
});

/** Refunds the model's current listing price to cash — simplified resale (no depreciation/condition-based pricing yet). */
export async function sellVehicle(actor: ActorContext, input: z.infer<typeof SellVehicleInput>) {
  const data = SellVehicleInput.parse(input);
  const vehicle = await getVehicle(data.guildId, data.vehicleId);
  if (!vehicle.ownerCharacterId) throw new ServiceError("VALIDATION_ERROR", {}, "Ce véhicule n'a pas de propriétaire.");
  const owner = await getCharacter(data.guildId, vehicle.ownerCharacterId);
  if (actor.discordUserId !== owner.discordUserId && !actor.isDiscordGuildAdmin) {
    throw new ServiceError("FORBIDDEN");
  }

  await prisma.$transaction([
    prisma.character.update({ where: { id: owner.id }, data: { cashCents: { increment: vehicle.model.priceCents } } }),
    prisma.vehicle.delete({ where: { id: vehicle.id } }),
  ]);

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: owner.id,
    action: "vehicle.sell",
    targetType: "Vehicle",
    targetId: vehicle.id,
    metadata: { model: vehicle.model.name, plate: vehicle.plate, refundCents: vehicle.model.priceCents },
  });

  return { refundCents: vehicle.model.priceCents };
}
