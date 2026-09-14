import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { assertWithinQuota } from "../quota/quota-service.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { hasPermission } from "../permissions/check-permission.js";
import { getCharacter } from "./character.service.js";
import { addItemToInventory, removeItemFromInventory } from "./inventory.service.js";

async function assertCanManageShop(actor: ActorContext, guildId: string, companyId: string | null) {
  if (hasPermission(actor, "MANAGE_SHOPS")) return;
  if (companyId) {
    const company = await prisma.company.findFirst({ where: { id: companyId, guildId }, include: { ownerCharacter: true } });
    if (company && company.ownerCharacter.discordUserId === actor.discordUserId) return;
  }
  throw new ServiceError("FORBIDDEN");
}

export const CreateShopInput = z.object({
  guildId: z.string(),
  name: z.string().min(2).max(56),
  logoUrl: z.string().optional(),
  placeId: z.string().optional(),
  companyId: z.string().optional(),
});
export type CreateShopInput = z.infer<typeof CreateShopInput>;

/** A shop tied to a company (companyId set) can be created by that company's owner — a guild admin can always create any shop. */
export async function createShop(actor: ActorContext, input: CreateShopInput) {
  const data = CreateShopInput.parse(input);
  await assertCanManageShop(actor, data.guildId, data.companyId ?? null);
  await assertWithinQuota(data.guildId, "shops");

  const existing = await prisma.shop.findUnique({ where: { guildId_name: { guildId: data.guildId, name: data.name } } });
  if (existing) throw new ServiceError("ALREADY_EXISTS", { name: data.name });

  const shop = await prisma.shop.create({
    data: { guildId: data.guildId, name: data.name, logoUrl: data.logoUrl, placeId: data.placeId, companyId: data.companyId },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "shop.create",
    targetType: "Shop",
    targetId: shop.id,
    metadata: { name: shop.name },
  });

  return shop;
}

export async function listShops(guildId: string) {
  return prisma.shop.findMany({ where: { guildId }, include: { company: true, place: true }, orderBy: { name: "asc" } });
}

export async function getShop(guildId: string, shopId: string) {
  const shop = await prisma.shop.findFirst({
    where: { id: shopId, guildId },
    include: { products: { include: { item: true } }, company: true, place: true },
  });
  if (!shop) throw new ServiceError("NOT_FOUND", { shopId });
  return shop;
}

export const AddShopProductInput = z.object({
  guildId: z.string(),
  shopId: z.string(),
  itemId: z.string(),
  priceCents: z.number().int().min(0),
  stock: z.number().int().min(0).optional(),
  canBuy: z.boolean().optional(),
  canSell: z.boolean().optional(),
});
export type AddShopProductInput = z.infer<typeof AddShopProductInput>;

export async function addShopProduct(actor: ActorContext, input: AddShopProductInput) {
  const data = AddShopProductInput.parse(input);
  const shop = await getShop(data.guildId, data.shopId);
  await assertCanManageShop(actor, data.guildId, shop.companyId);

  const item = await prisma.item.findFirst({ where: { id: data.itemId, guildId: data.guildId } });
  if (!item) throw new ServiceError("NOT_FOUND", { itemId: data.itemId });

  return prisma.shopProduct.upsert({
    where: { shopId_itemId: { shopId: shop.id, itemId: item.id } },
    update: { priceCents: data.priceCents, stock: data.stock, canBuy: data.canBuy ?? true, canSell: data.canSell ?? true },
    create: {
      shopId: shop.id,
      itemId: item.id,
      priceCents: data.priceCents,
      stock: data.stock,
      canBuy: data.canBuy ?? true,
      canSell: data.canSell ?? true,
    },
    include: { item: true },
  });
}

export const BuyFromShopInput = z.object({
  guildId: z.string(),
  shopId: z.string(),
  characterId: z.string(),
  itemId: z.string(),
  quantity: z.number().int().min(1).max(999),
});
export type BuyFromShopInput = z.infer<typeof BuyFromShopInput>;

export async function buyFromShop(actor: ActorContext, input: BuyFromShopInput) {
  const data = BuyFromShopInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  if (actor.discordUserId !== character.discordUserId && !hasPermission(actor, "MANAGE_ECONOMY")) {
    throw new ServiceError("FORBIDDEN");
  }

  const product = await prisma.shopProduct.findUnique({
    where: { shopId_itemId: { shopId: data.shopId, itemId: data.itemId } },
    include: { item: true, shop: true },
  });
  if (!product || !product.canBuy) throw new ServiceError("NOT_FOUND", {}, "Cet article n'est pas en vente ici.");
  if (product.stock !== null && product.stock < data.quantity) {
    throw new ServiceError("VALIDATION_ERROR", {}, "Stock insuffisant.");
  }

  const totalCents = product.priceCents * data.quantity;
  if (character.cashCents < totalCents) throw new ServiceError("INSUFFICIENT_CASH", { have: character.cashCents, need: totalCents });

  await prisma.$transaction(async (tx) => {
    await tx.character.update({ where: { id: character.id }, data: { cashCents: { decrement: totalCents } } });
    if (product.stock !== null) {
      await tx.shopProduct.update({ where: { id: product.id }, data: { stock: { decrement: data.quantity } } });
    }
    if (product.shop.companyId) {
      const treasury = await tx.bankAccount.findFirst({ where: { companyId: product.shop.companyId, type: "COMPANY" } });
      if (treasury) await tx.bankAccount.update({ where: { id: treasury.id }, data: { balanceCents: { increment: totalCents } } });
    }
    await tx.transaction.create({
      data: {
        guildId: data.guildId,
        type: "SHOP_PURCHASE",
        amountCents: totalCents,
        fromCharacterId: character.id,
        reason: `${data.quantity} × ${product.item.name} (${product.shop.id})`,
      },
    });
  });
  await addItemToInventory(data.guildId, character.id, product.itemId, data.quantity);

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: "shop.purchase",
    targetType: "Item",
    targetId: product.itemId,
    metadata: { quantity: data.quantity, totalCents },
  });

  return { totalCents };
}

export const SellToShopInput = BuyFromShopInput;
export type SellToShopInput = z.infer<typeof SellToShopInput>;

export async function sellToShop(actor: ActorContext, input: SellToShopInput) {
  const data = SellToShopInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  if (actor.discordUserId !== character.discordUserId && !hasPermission(actor, "MANAGE_ECONOMY")) {
    throw new ServiceError("FORBIDDEN");
  }

  const product = await prisma.shopProduct.findUnique({
    where: { shopId_itemId: { shopId: data.shopId, itemId: data.itemId } },
    include: { item: true, shop: true },
  });
  if (!product || !product.canSell) throw new ServiceError("NOT_FOUND", {}, "Cette boutique ne rachète pas cet objet.");

  await removeItemFromInventory(character.id, product.itemId, data.quantity);
  const totalCents = product.priceCents * data.quantity;

  await prisma.$transaction(async (tx) => {
    await tx.character.update({ where: { id: character.id }, data: { cashCents: { increment: totalCents } } });
    if (product.shop.companyId) {
      const treasury = await tx.bankAccount.findFirst({ where: { companyId: product.shop.companyId, type: "COMPANY" } });
      if (treasury) await tx.bankAccount.update({ where: { id: treasury.id }, data: { balanceCents: { decrement: totalCents } } });
    }
    await tx.transaction.create({
      data: {
        guildId: data.guildId,
        type: "SHOP_SALE",
        amountCents: totalCents,
        toCharacterId: character.id,
        reason: `${data.quantity} × ${product.item.name} (${product.shop.id})`,
      },
    });
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: "shop.sell",
    targetType: "Item",
    targetId: product.itemId,
    metadata: { quantity: data.quantity, totalCents },
  });

  return { totalCents };
}
