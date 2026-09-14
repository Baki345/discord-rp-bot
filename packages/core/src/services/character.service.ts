import { z } from "zod";
import { prisma } from "@discord-rp/database";
import type { ActorContext } from "../context/actor-context.js";
import { ServiceError } from "../errors/service-error.js";
import { assertWithinQuota } from "../quota/quota-service.js";
import { writeAuditLog } from "../audit/audit-log.js";
import { hasPermission } from "../permissions/check-permission.js";

function assertSelfOrGuildAdmin(actor: ActorContext, discordUserId: string) {
  // A guild admin, or anyone holding the delegable MANAGE_CHARACTERS flag
  // (e.g. a "Support" RPRole), can act on someone else's character.
  if (actor.discordUserId !== discordUserId && !hasPermission(actor, "MANAGE_CHARACTERS")) {
    throw new ServiceError("FORBIDDEN");
  }
}

export const CreateCharacterInput = z.object({
  guildId: z.string(),
  discordUserId: z.string(),
  firstName: z.string().min(2).max(32),
  lastName: z.string().min(2).max(32),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.string().max(32).optional(),
  nationality: z.string().max(56).optional(),
});
export type CreateCharacterInput = z.infer<typeof CreateCharacterInput>;

/**
 * The new character becomes the actor's active character in this guild
 * (deactivating any previous one) — /economie, /inventaire etc. always act
 * on whichever character is currently active, per user per guild.
 */
export async function createCharacter(actor: ActorContext, input: CreateCharacterInput) {
  const data = CreateCharacterInput.parse(input);
  assertSelfOrGuildAdmin(actor, data.discordUserId);
  await assertWithinQuota(data.guildId, "characters");

  const existing = await prisma.character.findUnique({
    where: {
      guildId_discordUserId_firstName_lastName: {
        guildId: data.guildId,
        discordUserId: data.discordUserId,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    },
  });
  if (existing && !existing.deletedAt) {
    throw new ServiceError("ALREADY_EXISTS", { firstName: data.firstName, lastName: data.lastName });
  }

  const config = await prisma.guildConfig.findUnique({ where: { guildId: data.guildId } });

  const character = await prisma.$transaction(async (tx) => {
    await tx.character.updateMany({
      where: { guildId: data.guildId, discordUserId: data.discordUserId, isActiveForUser: true },
      data: { isActiveForUser: false },
    });
    const created = await tx.character.create({
      data: {
        guildId: data.guildId,
        discordUserId: data.discordUserId,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        nationality: data.nationality,
        cashCents: config?.startingCashCents ?? 50_000,
        isActiveForUser: true,
      },
    });
    await tx.bankAccount.create({
      data: { guildId: data.guildId, characterId: created.id, type: "PERSONAL" },
    });
    return created;
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    actorCharacterId: character.id,
    action: "character.create",
    targetType: "Character",
    targetId: character.id,
    metadata: { firstName: character.firstName, lastName: character.lastName },
  });

  return character;
}

export async function getCharacter(guildId: string, characterId: string) {
  const character = await prisma.character.findFirst({
    where: { id: characterId, guildId, deletedAt: null },
  });
  if (!character) throw new ServiceError("NOT_FOUND", { characterId });
  return character;
}

export async function getActiveCharacter(guildId: string, discordUserId: string) {
  return prisma.character.findFirst({
    where: { guildId, discordUserId, isActiveForUser: true, deletedAt: null },
  });
}

export async function listCharacters(guildId: string, discordUserId: string) {
  return prisma.character.findMany({
    where: { guildId, discordUserId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
}

export const SwitchActiveCharacterInput = z.object({
  guildId: z.string(),
  characterId: z.string(),
});

export async function switchActiveCharacter(actor: ActorContext, input: z.infer<typeof SwitchActiveCharacterInput>) {
  const data = SwitchActiveCharacterInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  assertSelfOrGuildAdmin(actor, character.discordUserId);

  await prisma.$transaction([
    prisma.character.updateMany({
      where: { guildId: data.guildId, discordUserId: character.discordUserId, isActiveForUser: true },
      data: { isActiveForUser: false },
    }),
    prisma.character.update({ where: { id: character.id }, data: { isActiveForUser: true } }),
  ]);

  return getCharacter(data.guildId, data.characterId);
}

export const DeleteCharacterInput = z.object({
  guildId: z.string(),
  characterId: z.string(),
});

/** Soft delete: keeps the row (and every FK pointing to it — transactions, audit log, inventory) for history. */
export async function deleteCharacter(actor: ActorContext, input: z.infer<typeof DeleteCharacterInput>) {
  const data = DeleteCharacterInput.parse(input);
  const character = await getCharacter(data.guildId, data.characterId);
  assertSelfOrGuildAdmin(actor, character.discordUserId);

  const deleted = await prisma.character.update({
    where: { id: character.id },
    data: { deletedAt: new Date(), isActiveForUser: false, status: "ARCHIVED" },
  });

  await writeAuditLog({
    guildId: data.guildId,
    actorType: actor.source === "discord-bot" ? "DISCORD_USER" : "DASHBOARD_USER",
    actorDiscordId: actor.discordUserId,
    action: "character.delete",
    targetType: "Character",
    targetId: character.id,
    metadata: { firstName: character.firstName, lastName: character.lastName },
  });

  return deleted;
}
