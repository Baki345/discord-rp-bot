"use server";

import { revalidatePath } from "next/cache";
import { recordWebVerificationAttempt } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";

export async function submitWebVerificationAction(guildId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");

  await recordWebVerificationAttempt({ guildId, discordUserId: session.user.discordId });
  revalidatePath(`/verify/${guildId}`);
}
