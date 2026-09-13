/**
 * The one caller shape every service function in this package accepts.
 * apps/bot builds this from a discord.js Interaction (see
 * apps/bot/src/context/resolveActorContext.ts); apps/dashboard builds it
 * from an Auth.js session (see apps/dashboard/src/auth/resolveActorContext.ts).
 * Nothing inside packages/core ever imports discord.js or next — this is
 * the only surface where the two apps' worlds meet.
 */
export interface ActorContext {
  guildId: string;
  discordUserId: string;
  source: "discord-bot" | "dashboard";
  /** Resolved once at the edge (bot middleware / dashboard route guard), never recomputed inside a service. */
  isDiscordGuildAdmin: boolean;
  /** Flattened PermissionFlag strings from GuildMemberRPRole + any Discord-role-mapped RPRole. */
  rpPermissions: string[];
  /** The character the actor is currently acting as, when the operation is character-scoped. */
  activeCharacterId?: string;
}
