"use server";

import { revalidatePath } from "next/cache";
import { createLicense, addQuestion } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

export async function createLicenseAction(guildId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await createLicense(actor, {
    guildId,
    key: String(formData.get("key") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    passScorePct: Number(formData.get("passScorePct") ?? 80),
  });

  revalidatePath(`/g/${guildId}/licenses`);
}

export async function addQuestionAction(guildId: string, licenseId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  const choices = [1, 2, 3, 4]
    .map((n) => String(formData.get(`choice${n}`) ?? "").trim())
    .filter((c) => c.length > 0);
  const correctIndex = Number(formData.get("correctIndex") ?? 0);

  await addQuestion(actor, {
    guildId,
    licenseId,
    question: String(formData.get("question") ?? "").trim(),
    choices,
    correctIndex,
  });

  revalidatePath(`/g/${guildId}/licenses`);
}
