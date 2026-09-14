export interface DiscordUserGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string; // stringified bitfield
}

const ADMINISTRATOR = 0x8;
const MANAGE_GUILD = 0x20;

export function hasGuildAdminPermission(permissions: string): boolean {
  const bits = BigInt(permissions);
  return (bits & BigInt(ADMINISTRATOR)) !== 0n || (bits & BigInt(MANAGE_GUILD)) !== 0n;
}

/**
 * The Discord guilds the logged-in user belongs to, per their OAuth2
 * access token — used both by the guild picker (to list eligible guilds)
 * and by resolveActorContext (to check one specific guild's permission).
 * Throws on a 401 (expired/revoked token) rather than returning an empty
 * list, so callers can tell "no guilds" from "can't ask Discord right now".
 */
export async function fetchUserGuilds(accessToken: string): Promise<DiscordUserGuild[]> {
  const res = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Discord API /users/@me/guilds failed: ${res.status}`);
  }
  return res.json();
}
