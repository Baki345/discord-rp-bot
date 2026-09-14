"use server";

import { revalidatePath } from "next/cache";
import { createRobberyTarget } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

export async function createRobberyTargetAction(guildId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await createRobberyTarget(actor, {
    guildId,
    key: String(formData.get("key") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    rewardMinCents: Math.round(Number(formData.get("rewardMin") ?? 0) * 100),
    rewardMaxCents: Math.round(Number(formData.get("rewardMax") ?? 0) * 100),
    cooldownMinutes: Number(formData.get("cooldownMinutes") ?? 60),
    minPoliceOnDuty: Number(formData.get("minPoliceOnDuty") ?? 0),
    successChancePct: Number(formData.get("successChancePct") ?? 50),
    jailMinutes: Number(formData.get("jailMinutes") ?? 15),
  });

  revalidatePath(`/g/${guildId}/robbery`);
}
