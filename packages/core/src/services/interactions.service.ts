import { prisma } from "@discord-rp/database";

/** French display name -> nekos.best API endpoint, kept as the single source of truth so the bot command and any future UI agree on the same list. */
export const INTERACTION_ACTIONS = {
  calin: "hug",
  bisou: "kiss",
  tape: "slap",
  caresse: "pat",
  cajole: "cuddle",
  chatouille: "tickle",
  pousse: "poke",
  "tape-m-cinq": "highfive",
} as const;
export type InteractionAction = keyof typeof INTERACTION_ACTIONS;

export function isInteractionAction(value: string): value is InteractionAction {
  return value in INTERACTION_ACTIONS;
}

export async function recordInteractionGiven(guildId: string, discordUserId: string, action: string): Promise<void> {
  await prisma.interactionStat.upsert({
    where: { guildId_discordUserId_action: { guildId, discordUserId, action } },
    update: { countGiven: { increment: 1 } },
    create: { guildId, discordUserId, action, countGiven: 1 },
  });
}

export async function recordInteractionReceived(guildId: string, discordUserId: string, action: string): Promise<void> {
  await prisma.interactionStat.upsert({
    where: { guildId_discordUserId_action: { guildId, discordUserId, action } },
    update: { countReceived: { increment: 1 } },
    create: { guildId, discordUserId, action, countReceived: 1 },
  });
}

export async function getInteractionStats(guildId: string, discordUserId: string) {
  return prisma.interactionStat.findMany({ where: { guildId, discordUserId }, orderBy: { action: "asc" } });
}
