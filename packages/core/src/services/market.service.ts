import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { hasPermission } from "../permissions/check-permission.js";
import { isFeatureEnabled } from "../quota/quota-service.js";
import { getCharacter } from "./character.service.js";
import { getCompany } from "./company.service.js";

/** Price moves 0.5% per share traded on every buy/sell — a simple supply/demand nudge, not a real order book. */
const PRICE_NUDGE_PCT_PER_SHARE = 0.5;

export const ListCompanyInput = z.object({
  guildId: z.string(),
  companyId: z.string(),
  totalShares: z.number().int().min(1).max(1_000_000),
  initialSharePriceCents: z.number().int().min(1),
});
export type ListCompanyInput = z.infer<typeof ListCompanyInput>;

/** The owner (or MANAGE_MARKET) lists the company — all shares start allocated to the owner, who can then sell them off. */
export async function listCompanyOnMarket(actor: ActorContext, input: ListCompanyInput) {
  const data = ListCompanyInput.parse(input);
  const company = await getCompany(data.guildId, data.companyId);
  if (actor.discordUserId !== company.ownerCharacter.discordUserId && !hasPermission(actor, "MANAGE_MARKET")) {
    throw new ServiceError("FORBIDDEN");
  }
  if (company.isPubliclyListed) throw new ServiceError("ALREADY_EXISTS", {}, "Cette entreprise est déjà cotée en bourse.");

  const enabled = await isFeatureEnabled(data.guildId, "stockMarket");
  if (!enabled) {
    throw new ServiceError("VALIDATION_ERROR", {}, "La bourse n'est pas activée sur ce serveur (nécessite le plan Premium+).");
  }

  await prisma.$transaction([
    prisma.company.update({
      where: { id: company.id },
      data: { isPubliclyListed: true, totalShares: data.totalShares, sharePriceCents: data.initialSharePriceCents },
    }),
    prisma.companyShare.upsert({
      where: { companyId_characterId: { companyId: company.id, characterId: company.ownerCharacterId } },
      update: { quantity: { increment: data.totalShares } },
      create: { companyId: company.id, characterId: company.ownerCharacterId, quantity: data.totalShares },
    }),
    prisma.sharePriceHistory.create({ data: { companyId: company.id, priceCents: data.initialSharePriceCents } }),
  ]);

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "market.list",
    targetType: "Company",
    targetId: company.id,
    metadata: { totalShares: data.totalShares, initialSharePriceCents: data.initialSharePriceCents },
  });
}

export async function listMarket(guildId: string) {
  return prisma.company.findMany({
    where: { guildId, isPubliclyListed: true },
    select: { id: true, name: true, totalShares: true, sharePriceCents: true },
    orderBy: { name: "asc" },
  });
}

export async function getPriceHistory(companyId: string, limit = 30) {
  return prisma.sharePriceHistory.findMany({ where: { companyId }, orderBy: { recordedAt: "desc" }, take: limit });
}

export async function getPortfolio(characterId: string) {
  return prisma.companyShare.findMany({
    where: { characterId, quantity: { gt: 0 } },
    include: { company: { select: { name: true, sharePriceCents: true } } },
  });
}

async function assertListed(company: { isPubliclyListed: boolean; totalShares: number | null; sharePriceCents: number | null }) {
  if (!company.isPubliclyListed || company.totalShares == null || company.sharePriceCents == null) {
    throw new ServiceError("VALIDATION_ERROR", {}, "Cette entreprise n'est pas cotée en bourse.");
  }
}

async function nudgePrice(companyId: string, currentPriceCents: number, quantity: number, direction: 1 | -1) {
  const factor = 1 + direction * ((PRICE_NUDGE_PCT_PER_SHARE / 100) * quantity);
  const newPriceCents = Math.max(1, Math.round(currentPriceCents * factor));
  await prisma.$transaction([
    prisma.company.update({ where: { id: companyId }, data: { sharePriceCents: newPriceCents } }),
    prisma.sharePriceHistory.create({ data: { companyId, priceCents: newPriceCents } }),
  ]);
  return newPriceCents;
}

export const TradeSharesInput = z.object({
  guildId: z.string(),
  characterId: z.string(),
  companyId: z.string(),
  quantity: z.number().int().min(1),
});
export type TradeSharesInput = z.infer<typeof TradeSharesInput>;

/** Buying issues previously-unheld shares (up to totalShares) — proceeds go to the company treasury, like a secondary offering. */
export async function buyShares(actor: ActorContext, input: TradeSharesInput) {
  const data = TradeSharesInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  if (actor.discordUserId !== character.discordUserId) throw new ServiceError("FORBIDDEN");

  const company = await getCompany(data.guildId, data.companyId);
  await assertListed(company);

  const heldTotal = await prisma.companyShare.aggregate({ where: { companyId: company.id }, _sum: { quantity: true } });
  const available = company.totalShares! - (heldTotal._sum.quantity ?? 0);
  if (data.quantity > available) {
    throw new ServiceError("VALIDATION_ERROR", { available }, `Seulement ${available} action(s) disponible(s).`);
  }

  const costCents = data.quantity * company.sharePriceCents!;
  if (character.cashCents < costCents) {
    throw new ServiceError("INSUFFICIENT_CASH", { have: character.cashCents, need: costCents });
  }

  await prisma.$transaction([
    prisma.character.update({ where: { id: character.id }, data: { cashCents: { decrement: costCents } } }),
    ...(company.treasuryAccountId
      ? [prisma.bankAccount.update({ where: { id: company.treasuryAccountId }, data: { balanceCents: { increment: costCents } } })]
      : []),
    prisma.companyShare.upsert({
      where: { companyId_characterId: { companyId: company.id, characterId: character.id } },
      update: { quantity: { increment: data.quantity } },
      create: { companyId: company.id, characterId: character.id, quantity: data.quantity },
    }),
  ]);

  const newPriceCents = await nudgePrice(company.id, company.sharePriceCents!, data.quantity, 1);

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: "market.buy",
    targetType: "Company",
    targetId: company.id,
    metadata: { quantity: data.quantity, costCents, newPriceCents },
  });

  return { costCents, newPriceCents };
}

/** Selling returns shares to the unheld pool — proceeds paid from the company treasury (a buyback), capped by its balance. */
export async function sellShares(actor: ActorContext, input: TradeSharesInput) {
  const data = TradeSharesInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  if (actor.discordUserId !== character.discordUserId) throw new ServiceError("FORBIDDEN");

  const company = await getCompany(data.guildId, data.companyId);
  await assertListed(company);

  const held = await prisma.companyShare.findUnique({
    where: { companyId_characterId: { companyId: company.id, characterId: character.id } },
  });
  if (!held || held.quantity < data.quantity) {
    throw new ServiceError("VALIDATION_ERROR", {}, "Tu n'as pas assez d'actions à vendre.");
  }

  const proceedsCents = data.quantity * company.sharePriceCents!;
  const treasuryBalance = company.treasuryAccount?.balanceCents ?? 0;
  if (treasuryBalance < proceedsCents) {
    throw new ServiceError("VALIDATION_ERROR", {}, "La trésorerie de l'entreprise n'a pas assez de liquidités pour ce rachat.");
  }

  await prisma.$transaction([
    prisma.bankAccount.update({ where: { id: company.treasuryAccountId! }, data: { balanceCents: { decrement: proceedsCents } } }),
    prisma.character.update({ where: { id: character.id }, data: { cashCents: { increment: proceedsCents } } }),
    prisma.companyShare.update({ where: { id: held.id }, data: { quantity: { decrement: data.quantity } } }),
  ]);

  const newPriceCents = await nudgePrice(company.id, company.sharePriceCents!, data.quantity, -1);

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: "market.sell",
    targetType: "Company",
    targetId: company.id,
    metadata: { quantity: data.quantity, proceedsCents, newPriceCents },
  });

  return { proceedsCents, newPriceCents };
}
