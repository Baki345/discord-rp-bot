import { Events } from "discord.js";
import type { BotClient } from "../client.js";

export function registerReadyEvent(client: BotClient) {
  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Connecté en tant que ${readyClient.user.tag} — ${client.commands.size} commande(s) chargée(s).`);
  });
}
