import { Shoukaku, Connectors } from "shoukaku";
import { loadEnv } from "@discord-rp/config";
import type { BotClient } from "../client.js";

let shoukaku: Shoukaku | null = null;

/**
 * Music is optional infrastructure, unlike every other system in this
 * project: a fresh install has no Lavalink node configured yet, and that
 * must not stop the bot from booting. When LAVALINK_PASSWORD is unset,
 * this is a no-op — getShoukaku() stays null and every /musique command
 * replies that the feature isn't configured, instead of throwing.
 */
export function initMusicNode(client: BotClient): void {
  const env = loadEnv();
  if (!env.LAVALINK_PASSWORD) {
    console.warn("[musique] LAVALINK_PASSWORD non défini — /musique restera indisponible.");
    return;
  }

  shoukaku = new Shoukaku(new Connectors.DiscordJS(client), [
    {
      name: "main",
      url: `${env.LAVALINK_HOST}:${env.LAVALINK_PORT}`,
      auth: env.LAVALINK_PASSWORD,
    },
  ]);

  shoukaku.on("ready", (name) => console.log(`[musique] Nœud Lavalink "${name}" prêt.`));
  shoukaku.on("error", (name, error) => console.error(`[musique] Erreur sur le nœud Lavalink "${name}" :`, error));
  shoukaku.on("close", (name, code, reason) => console.warn(`[musique] Nœud Lavalink "${name}" fermé (${code}) : ${reason}`));
  shoukaku.on("disconnect", (name, count) => console.warn(`[musique] Nœud Lavalink "${name}" déconnecté (${count} lecteur(s) affecté(s)).`));
}

export function getShoukaku(): Shoukaku | null {
  return shoukaku;
}
