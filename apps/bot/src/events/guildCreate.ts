import { Events, type Guild } from "discord.js";
import { ensureGuild } from "@discord-rp/core";
import type { BotClient } from "../client.js";

/** Auto-bootstraps GuildConfig the moment the bot is added to a server, so /config setup is a fallback, not a requirement. */
export function registerGuildCreateEvent(client: BotClient) {
  client.on(Events.GuildCreate, async (guild: Guild) => {
    try {
      await ensureGuild({
        guildId: guild.id,
        name: guild.name,
        ownerDiscordId: guild.ownerId,
        iconUrl: guild.iconURL() ?? undefined,
      });
      console.log(`Serveur configuré automatiquement à l'installation : ${guild.name} (${guild.id})`);
    } catch (e) {
      console.error(`Échec de la configuration automatique pour ${guild.id}`, e);
    }
  });
}
