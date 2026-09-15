"use server";

import { revalidatePath } from "next/cache";
import { setVerificationConfig } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

export async function updateSuccessMessageAction(guildId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  const successMessage = String(formData.get("successMessage") ?? "").trim();
  if (!successMessage) return;

  await setVerificationConfig(actor, { guildId, config: { successMessage } });
  revalidatePath(`/g/${guildId}/verification`);
}
