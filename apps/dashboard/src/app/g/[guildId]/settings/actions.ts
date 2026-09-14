"use server";

import { revalidatePath } from "next/cache";
import { updateGuildConfig } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

export async function updateGuildConfigAction(guildId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  const startingCash = Number(formData.get("startingCash") ?? 0);
  const maxCharactersRaw = String(formData.get("maxCharactersOverride") ?? "").trim();

  await updateGuildConfig(actor, {
    guildId,
    startingCashCents: Math.round(startingCash * 100),
    maxCharactersOverride: maxCharactersRaw ? Number(maxCharactersRaw) : null,
    hungerThirstEnabled: formData.get("hungerThirstEnabled") === "on",
    requireActiveSession: formData.get("requireActiveSession") === "on",
  });

  revalidatePath(`/g/${guildId}/settings`);
}
