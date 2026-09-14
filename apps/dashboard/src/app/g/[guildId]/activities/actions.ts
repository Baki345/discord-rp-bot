"use server";

import { revalidatePath } from "next/cache";
import { createActivity } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

export async function createActivityAction(guildId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await createActivity(actor, {
    guildId,
    key: String(formData.get("key") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    cooldownMinutes: Number(formData.get("cooldownMinutes") ?? 30),
    rewardCashMinCents: Math.round(Number(formData.get("rewardMin") ?? 0) * 100),
    rewardCashMaxCents: Math.round(Number(formData.get("rewardMax") ?? 0) * 100),
  });

  revalidatePath(`/g/${guildId}/activities`);
}
