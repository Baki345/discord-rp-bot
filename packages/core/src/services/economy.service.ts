import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { hasPermission } from "../permissions/check-permission.js";
import { getCharacter } from "./character.service.js";

export const TransferMoneyInput = z.object({
  guildId: z.string(),
  fromCharacterId: z.string(),
  toCharacterId: z.string(),
  amountCents: z.number().int().positive(),
  via: z.enum(["cash", "bank"]),
  reason: z.string().max(200).optional(),
});
export type TransferMoneyInput = z.infer<typeof TransferMoneyInput>;

/**
 * Only the sending character's owner (or a guild admin, e.g. issuing a
 * refund) may initiate a transfer — the recipient never needs to consent,
 * same as handing someone cash in person.
 */
export async function transferMoney(actor: ActorContext, input: TransferMoneyInput) {
  const data = TransferMoneyInput.parse(input);
  if (data.fromCharacterId === data.toCharacterId) {
    throw new ServiceError("VALIDATION_ERROR", {}, "Tu ne peux pas te payer toi-même.");
  }

  const [fromCharacter, toCharacter] = await Promise.all([
    getCharacter(data.guildId, data.fromCharacterId),
    getCharacter(data.guildId, data.toCharacterId),
  ]);

  if (actor.discordUserId !== fromCharacter.discordUserId && !hasPermission(actor, "MANAGE_ECONOMY")) {
    throw new ServiceError("FORBIDDEN");
  }

  const result = await prisma.$transaction(async (tx) => {
    if (data.via === "cash") {
      if (fromCharacter.cashCents < data.amountCents) {
        throw new ServiceError("INSUFFICIENT_CASH", { have: fromCharacter.cashCents, need: data.amountCents });
      }
      await tx.character.update({ where: { id: fromCharacter.id }, data: { cashCents: { decrement: data.amountCents } } });
      await tx.character.update({ where: { id: toCharacter.id }, data: { cashCents: { increment: data.amountCents } } });
      const transaction = await tx.transaction.create({
        data: {
          guildId: data.guildId,
          type: "TRANSFER_CASH",
          amountCents: data.amountCents,
          fromCharacterId: fromCharacter.id,
          toCharacterId: toCharacter.id,
          reason: data.reason,
        },
      });
      return { transactionId: transaction.id };
    }

    const [fromAccount, toAccount] = await Promise.all([
      tx.bankAccount.findFirst({ where: { characterId: fromCharacter.id, type: "PERSONAL" } }),
      tx.bankAccount.findFirst({ where: { characterId: toCharacter.id, type: "PERSONAL" } }),
    ]);
    if (!fromAccount || !toAccount) throw new ServiceError("NOT_FOUND", {}, "Compte bancaire introuvable.");
    if (fromAccount.balanceCents < data.amountCents) {
      throw new ServiceError("INSUFFICIENT_FUNDS", { have: fromAccount.balanceCents, need: data.amountCents });
    }
    await tx.bankAccount.update({ where: { id: fromAccount.id }, data: { balanceCents: { decrement: data.amountCents } } });
    await tx.bankAccount.update({ where: { id: toAccount.id }, data: { balanceCents: { increment: data.amountCents } } });
    const transaction = await tx.transaction.create({
      data: {
        guildId: data.guildId,
        type: "TRANSFER_BANK",
        amountCents: data.amountCents,
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        fromCharacterId: fromCharacter.id,
        toCharacterId: toCharacter.id,
        reason: data.reason,
      },
    });
    return { transactionId: transaction.id };
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: fromCharacter.id,
    action: "economy.transfer",
    targetType: "Character",
    targetId: toCharacter.id,
    metadata: { amountCents: data.amountCents, via: data.via, reason: data.reason },
  });

  return result;
}

export async function getTransactionHistory(guildId: string, characterId: string, limit = 10) {
  await getCharacter(guildId, characterId);
  return prisma.transaction.findMany({
    where: {
      guildId,
      OR: [{ fromCharacterId: characterId }, { toCharacterId: characterId }],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
