import { getActiveCharacter } from "@discord-rp/core";

export const NO_ACTIVE_CHARACTER_MESSAGE = "Tu n'as pas de personnage actif — utilise `/personnage create` ou `/personnage switch`.";

/** Every economy/inventory/etc. command acts on the caller's currently active character — resolved here, once. */
export async function requireActiveCharacter(guildId: string, discordUserId: string) {
  const character = await getActiveCharacter(guildId, discordUserId);
  if (!character) return null;
  return character;
}

export function formatCents(cents: number): string {
  return `${(cents / 100).toFixed(2)} $`;
}
