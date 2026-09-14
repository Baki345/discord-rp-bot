"use server";

import { revalidatePath } from "next/cache";
import { createRPRole, deleteRPRole, assignRole, unassignRole, type PermissionFlag } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

export async function createRPRoleAction(guildId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  const key = String(formData.get("key") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || undefined;
  const permissions = formData.getAll("permissions").map(String) as PermissionFlag[];

  await createRPRole(actor, { guildId, key, name, color, permissions });
  revalidatePath(`/g/${guildId}/permissions`);
}

export async function deleteRPRoleAction(guildId: string, roleId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await deleteRPRole(actor, guildId, roleId);
  revalidatePath(`/g/${guildId}/permissions`);
}

export async function assignRoleAction(guildId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  const discordUserId = String(formData.get("discordUserId") ?? "").trim();
  const roleId = String(formData.get("roleId") ?? "").trim();

  await assignRole(actor, { guildId, discordUserId, roleId });
  revalidatePath(`/g/${guildId}/permissions`);
}

export async function unassignRoleAction(guildId: string, discordUserId: string, roleId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await unassignRole(actor, { guildId, discordUserId, roleId });
  revalidatePath(`/g/${guildId}/permissions`);
}
