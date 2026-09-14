"use server";

import { revalidatePath } from "next/cache";
import { createItem } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

export async function createItemAction(guildId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await createItem(actor, {
    guildId,
    key: String(formData.get("key") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || undefined,
    category: String(formData.get("category") ?? "").trim(),
    priceCents: Math.round(Number(formData.get("price") ?? 0) * 100),
    isStackable: formData.get("isStackable") === "on",
    isUsable: formData.get("isUsable") === "on",
    isConsumable: formData.get("isConsumable") === "on",
    isIllegal: formData.get("isIllegal") === "on",
  });

  revalidatePath(`/g/${guildId}/items`);
}
