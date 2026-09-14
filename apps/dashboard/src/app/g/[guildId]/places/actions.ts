"use server";

import { revalidatePath } from "next/cache";
import { createPlace, deletePlace } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

export async function createPlaceAction(guildId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await createPlace(actor, {
    guildId,
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim() || undefined,
    description: String(formData.get("description") ?? "").trim() || undefined,
  });

  revalidatePath(`/g/${guildId}/places`);
}

export async function deletePlaceAction(guildId: string, placeId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await deletePlace(actor, { guildId, placeId });
  revalidatePath(`/g/${guildId}/places`);
}
