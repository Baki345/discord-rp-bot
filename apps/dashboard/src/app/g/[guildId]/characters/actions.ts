"use server";

import { revalidatePath } from "next/cache";
import { createCharacter, deleteCharacter } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

export async function createCharacterAction(guildId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  const discordUserId = String(formData.get("discordUserId") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();

  await createCharacter(actor, { guildId, discordUserId, firstName, lastName });
  revalidatePath(`/g/${guildId}/characters`);
}

export async function deleteCharacterAction(guildId: string, characterId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await deleteCharacter(actor, { guildId, characterId });
  revalidatePath(`/g/${guildId}/characters`);
}
