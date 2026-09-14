"use server";

import { revalidatePath } from "next/cache";
import { createVehicleCategory, createVehicleModel } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

export async function createVehicleCategoryAction(guildId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await createVehicleCategory(actor, {
    guildId,
    key: String(formData.get("key") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
  });
  revalidatePath(`/g/${guildId}/vehicles`);
}

export async function createVehicleModelAction(guildId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await createVehicleModel(actor, {
    guildId,
    categoryId: String(formData.get("categoryId") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    brand: String(formData.get("brand") ?? "").trim() || undefined,
    priceCents: Math.round(Number(formData.get("price") ?? 0) * 100),
  });
  revalidatePath(`/g/${guildId}/vehicles`);
}
