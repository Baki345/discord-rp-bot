"use server";

import { revalidatePath } from "next/cache";
import { updateTicketCategory, deleteTicketCategory } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

function parseRoleIds(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function updateTicketCategoryRolesAction(guildId: string, categoryId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  const limitRaw = String(formData.get("ticketLimitPerUser") ?? "").trim();
  const autoCloseRaw = String(formData.get("autoCloseAfterMinutesInactive") ?? "").trim();

  await updateTicketCategory(actor, guildId, categoryId, {
    supportRoleIds: parseRoleIds(formData.get("supportRoleIds")),
    claimRoleIds: parseRoleIds(formData.get("claimRoleIds")),
    closeRoleIds: parseRoleIds(formData.get("closeRoleIds")),
    vcRequestRoleIds: parseRoleIds(formData.get("vcRequestRoleIds")),
    ticketLimitPerUser: limitRaw ? Number(limitRaw) : null,
    autoCloseAfterMinutesInactive: autoCloseRaw ? Number(autoCloseRaw) : null,
  });

  revalidatePath(`/g/${guildId}/tickets`);
}

export async function deleteTicketCategoryAction(guildId: string, categoryId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await deleteTicketCategory(actor, guildId, categoryId);

  revalidatePath(`/g/${guildId}/tickets`);
}
