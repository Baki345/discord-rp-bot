"use server";

import { revalidatePath } from "next/cache";
import { depositToBank, withdrawFromBank } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

function parseAmountCents(formData: FormData): number {
  const raw = Number(formData.get("amount"));
  return Math.round(raw * 100);
}

export async function adjustDepositAction(guildId: string, characterId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await depositToBank(actor, { guildId, characterId, amountCents: parseAmountCents(formData) });
  revalidatePath(`/g/${guildId}/economy`);
}

export async function adjustWithdrawAction(guildId: string, characterId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await withdrawFromBank(actor, { guildId, characterId, amountCents: parseAmountCents(formData) });
  revalidatePath(`/g/${guildId}/economy`);
}
