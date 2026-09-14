"use server";

import { revalidatePath } from "next/cache";
import { createDrugType } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

export async function createDrugTypeAction(guildId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await createDrugType(actor, {
    guildId,
    key: String(formData.get("key") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    linkedItemId: String(formData.get("linkedItemId") ?? "").trim(),
    cooldownMinutes: Number(formData.get("cooldownMinutes") ?? 20),
    sellPriceMinCents: Math.round(Number(formData.get("sellPriceMin") ?? 0) * 100),
    sellPriceMaxCents: Math.round(Number(formData.get("sellPriceMax") ?? 0) * 100),
    arrestChancePct: Number(formData.get("arrestChancePct") ?? 10),
    arrestJailMinutes: Number(formData.get("arrestJailMinutes") ?? 20),
  });

  revalidatePath(`/g/${guildId}/drugs`);
}
