"use server";

import { revalidatePath } from "next/cache";
import { createCompany, hireEmployee, fireEmployee, setLaunderingFront } from "@discord-rp/core";
import { auth } from "@/auth/auth.config";
import { resolveActorContext } from "@/auth/resolveActorContext";

export async function createCompanyAction(guildId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  const ownerCharacterId = String(formData.get("ownerCharacterId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || undefined;

  await createCompany(actor, { guildId, ownerCharacterId, name, description });
  revalidatePath(`/g/${guildId}/companies`);
}

export async function hireEmployeeAction(guildId: string, companyId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  const characterId = String(formData.get("characterId") ?? "").trim();
  await hireEmployee(actor, { guildId, companyId, characterId });
  revalidatePath(`/g/${guildId}/companies/${companyId}`);
}

export async function fireEmployeeAction(guildId: string, companyId: string, characterId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await fireEmployee(actor, { guildId, companyId, characterId });
  revalidatePath(`/g/${guildId}/companies/${companyId}`);
}

export async function setLaunderingFrontAction(guildId: string, companyId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Non connecté.");
  const actor = await resolveActorContext(session, guildId);

  await setLaunderingFront(actor, { guildId, companyId, isLaunderingFront: formData.get("isLaunderingFront") === "on" });
  revalidatePath(`/g/${guildId}/companies/${companyId}`);
}
