"use server";

import { revalidatePath } from "next/cache";
import { setMusicConfig } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

function parseIds(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function saveMusicConfigAction(guildId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  const djRoleId = String(formData.get("djRoleId") ?? "").trim();

  await setMusicConfig(actor, guildId, {
    enabled: formData.get("enabled") === "on",
    djRoleId: djRoleId || null,
    allowedVoiceChannelIds: parseIds(formData.get("allowedVoiceChannelIds")),
    allowedTextChannelIds: parseIds(formData.get("allowedTextChannelIds")),
    defaultVolume: Number(formData.get("defaultVolume") ?? 100),
    maxQueueSize: Number(formData.get("maxQueueSize") ?? 100),
  });

  revalidatePath(`/g/${guildId}/music`);
}
