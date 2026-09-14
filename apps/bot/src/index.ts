import "dotenv/config";
import { GatewayIntentBits } from "discord.js";
import { loadEnv } from "@discord-rp/config";
import { BotClient } from "./client.js";
import { configCommand } from "./commands/config/index.js";
import { personnageCommand } from "./commands/personnage/index.js";
import { personnageCreateModalHandler, personnageDeleteConfirmHandler } from "./commands/personnage/interactions.js";
import { economieCommand } from "./commands/economie/index.js";
import { banqueCommand } from "./commands/banque/index.js";
import { metierCommand } from "./commands/metier/index.js";
import { entrepriseCommand } from "./commands/entreprise/index.js";
import { vehiculeCommand } from "./commands/vehicule/index.js";
import { boutiqueCommand } from "./commands/boutique/index.js";
import { inventaireCommand } from "./commands/inventaire/index.js";
import { lieuCommand } from "./commands/lieu/index.js";
import { cleCommand } from "./commands/cle/index.js";
import { activiteCommand } from "./commands/activite/index.js";
import { registerReadyEvent } from "./events/ready.js";
import { registerGuildCreateEvent } from "./events/guildCreate.js";
import { registerInteractionCreateEvent } from "./events/interactionCreate.js";
import { startAuditLogMirror } from "./audit/mirrorAuditLogs.js";
import { startNeedsTicker } from "./needs/tickNeeds.js";

const env = loadEnv();
if (!env.DISCORD_BOT_TOKEN) {
  throw new Error("DISCORD_BOT_TOKEN is required to start the bot.");
}

const client = new BotClient({ intents: [GatewayIntentBits.Guilds] });

for (const command of [
  configCommand,
  personnageCommand,
  economieCommand,
  banqueCommand,
  metierCommand,
  entrepriseCommand,
  vehiculeCommand,
  boutiqueCommand,
  inventaireCommand,
  lieuCommand,
  cleCommand,
  activiteCommand,
]) {
  client.commands.set(command.data.name, command);
}
client.modalHandlers.push(personnageCreateModalHandler);
client.buttonHandlers.push(personnageDeleteConfirmHandler);

registerReadyEvent(client);
registerGuildCreateEvent(client);
registerInteractionCreateEvent(client);
startAuditLogMirror(client);
startNeedsTicker();

client.login(env.DISCORD_BOT_TOKEN);
