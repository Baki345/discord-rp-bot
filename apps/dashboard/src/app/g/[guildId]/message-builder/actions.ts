"use server";

import { revalidatePath } from "next/cache";
import { saveMessageTemplate, deleteMessageTemplate, type MessageTemplateContent } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

export async function saveMessageTemplateAction(guildId: string, name: string, content: MessageTemplateContent): Promise<{ error?: string }> {
  const session = await auth();
  if (!session) return { error: "Non connecté." };
  const actor = await resolveActorContext(session, guildId);

  try {
    await saveMessageTemplate(actor, { guildId, name, content });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Échec de l'enregistrement." };
  }

  revalidatePath(`/g/${guildId}/message-builder`);
  return {};
}

export async function deleteMessageTemplateAction(guildId: string, name: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await deleteMessageTemplate(actor, guildId, name);

  revalidatePath(`/g/${guildId}/message-builder`);
}
