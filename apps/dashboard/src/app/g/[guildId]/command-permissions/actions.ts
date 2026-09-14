"use server";

import { revalidatePath } from "next/cache";
import { upsertCommandPermissionOverride, deleteCommandPermissionOverride } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

function parseIds(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function saveCommandPermissionOverrideAction(guildId: string, commandName: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  const cooldownRaw = String(formData.get("cooldownSeconds") ?? "").trim();

  await upsertCommandPermissionOverride(actor, {
    guildId,
    commandName,
    allowedRoleIds: parseIds(formData.get("allowedRoleIds")),
    deniedRoleIds: parseIds(formData.get("deniedRoleIds")),
    allowedChannelIds: parseIds(formData.get("allowedChannelIds")),
    cooldownSeconds: cooldownRaw ? Number(cooldownRaw) : null,
  });

  revalidatePath(`/g/${guildId}/command-permissions`);
}

export async function deleteCommandPermissionOverrideAction(guildId: string, commandName: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await deleteCommandPermissionOverride(actor, guildId, commandName);

  revalidatePath(`/g/${guildId}/command-permissions`);
}
