"use server";

import { revalidatePath } from "next/cache";
import { updateApplicationCategory, deleteApplicationCategory } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

function parseRoleIds(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function updateApplicationCategoryAction(guildId: string, categoryId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  const resultChannelId = String(formData.get("resultChannelId") ?? "").trim();
  const questionsRaw = String(formData.get("questionsJson") ?? "").trim();

  await updateApplicationCategory(actor, guildId, categoryId, {
    reviewerRoleIds: parseRoleIds(formData.get("reviewerRoleIds")),
    resultChannelId: resultChannelId || null,
    ...(questionsRaw ? { questions: JSON.parse(questionsRaw) } : {}),
  });

  revalidatePath(`/g/${guildId}/candidatures`);
}

export async function deleteApplicationCategoryAction(guildId: string, categoryId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await deleteApplicationCategory(actor, guildId, categoryId);

  revalidatePath(`/g/${guildId}/candidatures`);
}
