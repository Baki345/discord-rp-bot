import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { isFeatureEnabled } from "../quota/quota-service.js";
import { getCharacter } from "./character.service.js";
import { getCompany } from "./company.service.js";

const RACKET_COOLDOWN_MINUTES = 60;
const RACKET_PERCENTAGE_OF_TREASURY = 10;

export const CollectRacketInput = z.object({
  guildId: z.string(),
  characterId: z.string(),
  companyId: z.string(),
});
export type CollectRacketInput = z.infer<typeof CollectRacketInput>;

/** Takes a fixed cut of the company's treasury on a per-company cooldown — no admin-configurable target catalog, unlike robbery. */
export async function collectRacket(actor: ActorContext, input: CollectRacketInput) {
  const data = CollectRacketInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  if (actor.discordUserId !== character.discordUserId) throw new ServiceError("FORBIDDEN");

  const enabled = await isFeatureEnabled(data.guildId, "racket");
  if (!enabled) {
    throw new ServiceError("VALIDATION_ERROR", {}, "Le racket n'est pas activé sur ce serveur (nécessite un plan supérieur).");
  }

  const company = await getCompany(data.guildId, data.companyId);
  if (company.lastRacketedAt) {
    const cooldownEndsAt = new Date(company.lastRacketedAt.getTime() + RACKET_COOLDOWN_MINUTES * 60_000);
    if (cooldownEndsAt.getTime() > Date.now()) {
      const remainingMin = Math.ceil((cooldownEndsAt.getTime() - Date.now()) / 60_000);
      throw new ServiceError("VALIDATION_ERROR", { remainingMin }, `Cette entreprise a déjà été rackettée récemment — réessaie dans ${remainingMin} min.`);
    }
  }

  const treasuryBalance = company.treasuryAccount?.balanceCents ?? 0;
  const amountCents = Math.floor((treasuryBalance * RACKET_PERCENTAGE_OF_TREASURY) / 100);
  if (amountCents <= 0) {
    throw new ServiceError("VALIDATION_ERROR", {}, "Cette entreprise n'a pas assez d'argent en trésorerie pour valoir le coup.");
  }

  await prisma.$transaction([
    prisma.bankAccount.update({ where: { id: company.treasuryAccountId! }, data: { balanceCents: { decrement: amountCents } } }),
    prisma.character.update({ where: { id: character.id }, data: { cashCents: { increment: amountCents } } }),
    prisma.company.update({ where: { id: company.id }, data: { lastRacketedAt: new Date() } }),
    prisma.racketCollection.create({
      data: { guildId: data.guildId, companyId: company.id, characterId: character.id, amountCents },
    }),
  ]);

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: "racket.collect",
    targetType: "Company",
    targetId: company.id,
    metadata: { amountCents },
  });

  return { amountCents };
}

export async function listRacketHistory(guildId: string, companyId: string, limit = 20) {
  return prisma.racketCollection.findMany({ where: { guildId, companyId }, orderBy: { createdAt: "desc" }, take: limit });
}
