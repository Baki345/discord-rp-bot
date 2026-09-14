import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { getCharacter } from "./character.service.js";

function assertOwnsCharacterOrGuildAdmin(actor: ActorContext, characterDiscordUserId: string) {
  if (actor.discordUserId !== characterDiscordUserId && !actor.isDiscordGuildAdmin) {
    throw new ServiceError("FORBIDDEN");
  }
}

async function getPersonalAccount(characterId: string) {
  const account = await prisma.bankAccount.findFirst({ where: { characterId, type: "PERSONAL" } });
  if (!account) throw new ServiceError("NOT_FOUND", { characterId }, "Ce personnage n'a pas de compte bancaire.");
  return account;
}

export const DepositInput = z.object({
  guildId: z.string(),
  characterId: z.string(),
  amountCents: z.number().int().positive(),
});
export type DepositInput = z.infer<typeof DepositInput>;

export async function depositToBank(actor: ActorContext, input: DepositInput) {
  const data = DepositInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  assertOwnsCharacterOrGuildAdmin(actor, character.discordUserId);

  if (character.cashCents < data.amountCents) {
    throw new ServiceError("INSUFFICIENT_CASH", { have: character.cashCents, need: data.amountCents });
  }
  const account = await getPersonalAccount(character.id);

  const result = await prisma.$transaction(async (tx) => {
    await tx.character.update({ where: { id: character.id }, data: { cashCents: { decrement: data.amountCents } } });
    const updatedAccount = await tx.bankAccount.update({
      where: { id: account.id },
      data: { balanceCents: { increment: data.amountCents } },
    });
    const transaction = await tx.transaction.create({
      data: {
        guildId: data.guildId,
        type: "DEPOSIT",
        amountCents: data.amountCents,
        toAccountId: account.id,
        toCharacterId: character.id,
      },
    });
    return { balanceCents: updatedAccount.balanceCents, transactionId: transaction.id };
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: "bank.deposit",
    targetType: "BankAccount",
    targetId: account.id,
    metadata: { amountCents: data.amountCents },
  });

  return result;
}

export const WithdrawInput = DepositInput;
export type WithdrawInput = z.infer<typeof WithdrawInput>;

export async function withdrawFromBank(actor: ActorContext, input: WithdrawInput) {
  const data = WithdrawInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  assertOwnsCharacterOrGuildAdmin(actor, character.discordUserId);
  const account = await getPersonalAccount(character.id);

  if (account.balanceCents < data.amountCents) {
    throw new ServiceError("INSUFFICIENT_FUNDS", { have: account.balanceCents, need: data.amountCents });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedAccount = await tx.bankAccount.update({
      where: { id: account.id },
      data: { balanceCents: { decrement: data.amountCents } },
    });
    await tx.character.update({ where: { id: character.id }, data: { cashCents: { increment: data.amountCents } } });
    const transaction = await tx.transaction.create({
      data: {
        guildId: data.guildId,
        type: "WITHDRAW",
        amountCents: data.amountCents,
        fromAccountId: account.id,
        fromCharacterId: character.id,
      },
    });
    return { balanceCents: updatedAccount.balanceCents, transactionId: transaction.id };
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: "bank.withdraw",
    targetType: "BankAccount",
    targetId: account.id,
    metadata: { amountCents: data.amountCents },
  });

  return result;
}

export async function getBankAccount(guildId: string, characterId: string) {
  await getCharacter(guildId, characterId); // throws NOT_FOUND if the character doesn't belong to this guild
  return getPersonalAccount(characterId);
}
