import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { isFeatureEnabled } from "../quota/quota-service.js";
import { getCharacter } from "./character.service.js";
import { getCompany } from "./company.service.js";

const LAUNDER_FEE_PCT = 20;
const LAUNDER_COOLDOWN_MINUTES = 30;
const LAUNDER_MAX_AMOUNT_CENTS = 1_000_000; // $10,000 per operation — keeps it a deliberate risk/reward move, not an instant-clean faucet

export const LaunderMoneyInput = z.object({
  guildId: z.string(),
  characterId: z.string(),
  companyId: z.string(),
  amountCents: z.number().int().positive().max(LAUNDER_MAX_AMOUNT_CENTS),
});
export type LaunderMoneyInput = z.infer<typeof LaunderMoneyInput>;

/** Cash -> the character's personal bank account, minus a fee that goes to the front company's treasury. Instant, cooldown-limited. */
export async function launderMoney(actor: ActorContext, input: LaunderMoneyInput) {
  const data = LaunderMoneyInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  if (actor.discordUserId !== character.discordUserId) throw new ServiceError("FORBIDDEN");

  const enabled = await isFeatureEnabled(data.guildId, "racket");
  if (!enabled) {
    throw new ServiceError("VALIDATION_ERROR", {}, "Le blanchiment n'est pas activé sur ce serveur (nécessite un plan supérieur).");
  }

  const company = await getCompany(data.guildId, data.companyId);
  if (!company.isLaunderingFront) {
    throw new ServiceError("VALIDATION_ERROR", {}, `"${company.name}" n'est pas une façade de blanchiment.`);
  }
  if (character.cashCents < data.amountCents) {
    throw new ServiceError("INSUFFICIENT_CASH", { have: character.cashCents, need: data.amountCents });
  }

  const lastOp = await prisma.launderingOperation.findFirst({
    where: { characterId: character.id },
    orderBy: { createdAt: "desc" },
  });
  if (lastOp) {
    const cooldownEndsAt = new Date(lastOp.createdAt.getTime() + LAUNDER_COOLDOWN_MINUTES * 60_000);
    if (cooldownEndsAt.getTime() > Date.now()) {
      const remainingMin = Math.ceil((cooldownEndsAt.getTime() - Date.now()) / 60_000);
      throw new ServiceError("VALIDATION_ERROR", { remainingMin }, `Encore en recharge — réessaie dans ${remainingMin} min.`);
    }
  }

  const feeCents = Math.round((data.amountCents * LAUNDER_FEE_PCT) / 100);
  const netCents = data.amountCents - feeCents;

  const personalAccount = await prisma.bankAccount.findFirst({ where: { characterId: character.id, type: "PERSONAL" } });
  if (!personalAccount) throw new ServiceError("NOT_FOUND", {}, "Ce personnage n'a pas de compte bancaire.");

  await prisma.$transaction([
    prisma.character.update({ where: { id: character.id }, data: { cashCents: { decrement: data.amountCents } } }),
    prisma.bankAccount.update({ where: { id: personalAccount.id }, data: { balanceCents: { increment: netCents } } }),
    ...(company.treasuryAccountId
      ? [prisma.bankAccount.update({ where: { id: company.treasuryAccountId }, data: { balanceCents: { increment: feeCents } } })]
      : []),
    prisma.transaction.create({
      data: {
        guildId: data.guildId,
        type: "LAUNDER",
        amountCents: netCents,
        toAccountId: personalAccount.id,
        toCharacterId: character.id,
        reason: `Blanchiment via ${company.name}`,
      },
    }),
    prisma.launderingOperation.create({
      data: { guildId: data.guildId, companyId: company.id, characterId: character.id, grossCents: data.amountCents, feeCents, netCents },
    }),
  ]);

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: "laundering.launder",
    targetType: "Company",
    targetId: company.id,
    metadata: { grossCents: data.amountCents, feeCents, netCents },
  });

  return { grossCents: data.amountCents, feeCents, netCents };
}

export async function listLaunderingHistory(guildId: string, companyId: string, limit = 20) {
  return prisma.launderingOperation.findMany({ where: { guildId, companyId }, orderBy: { createdAt: "desc" }, take: limit });
}
