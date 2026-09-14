"use server";

import { revalidatePath } from "next/cache";
import { setGuildBlacklisted, setGuildPlan } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";

export async function setGuildBlacklistedAction(guildId: string, isBlacklisted: boolean): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");

  await setGuildBlacklisted(session.user.discordId, { guildId, isBlacklisted });

  revalidatePath("/admin");
}

export async function setGuildPlanAction(guildId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");

  const planId = String(formData.get("planId") ?? "");
  await setGuildPlan(session.user.discordId, { guildId, planId });

  revalidatePath("/admin");
}
