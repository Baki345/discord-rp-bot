"use server";

import { revalidatePath } from "next/cache";
import { createRecipe } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

export async function createRecipeAction(guildId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  const ingredients = [1, 2, 3]
    .map((n) => ({
      itemId: String(formData.get(`ingredientItem${n}`) ?? "").trim(),
      quantity: Number(formData.get(`ingredientQty${n}`) ?? 0),
    }))
    .filter((i) => i.itemId && i.quantity > 0);

  await createRecipe(actor, {
    guildId,
    key: String(formData.get("key") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    resultItemId: String(formData.get("resultItemId") ?? "").trim(),
    resultQuantity: Number(formData.get("resultQuantity") ?? 1),
    ingredients,
  });

  revalidatePath(`/g/${guildId}/crafting`);
}
