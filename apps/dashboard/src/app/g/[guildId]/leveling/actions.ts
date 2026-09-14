"use server";

import { revalidatePath } from "next/cache";
import { setLevelingConfig } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

export async function updateLevelingConfigAction(guildId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  const rewardRolesRaw = String(formData.get("rewardRolesJson") ?? "").trim();
  const defaultBackground = String(formData.get("defaultCardBackgroundUrl") ?? "").trim();

  await setLevelingConfig(actor, guildId, {
    enabled: formData.get("enabled") === "on",
    xpPerMessage: Number(formData.get("xpPerMessage") ?? 15),
    xpPerVoiceMinute: Number(formData.get("xpPerVoiceMinute") ?? 10),
    cooldownSeconds: Number(formData.get("cooldownSeconds") ?? 60),
    curveMultiplier: Number(formData.get("curveMultiplier") ?? 1),
    defaultCardBackgroundUrl: defaultBackground || null,
    ...(rewardRolesRaw ? { rewardRoles: JSON.parse(rewardRolesRaw) } : {}),
  });

  revalidatePath(`/g/${guildId}/leveling`);
}
