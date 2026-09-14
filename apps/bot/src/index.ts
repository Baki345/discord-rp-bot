import "dotenv/config";
import { GatewayIntentBits } from "discord.js";
import { loadEnv } from "@discord-rp/config";
import { BotClient } from "./client.js";
import { configCommand } from "./commands/config/index.js";
import { personnageCommand } from "./commands/personnage/index.js";
import { personnageCreateModalHandler, personnageDeleteConfirmHandler } from "./commands/personnage/interactions.js";
import { registerReadyEvent } from "./events/ready.js";
import { registerGuildCreateEvent } from "./events/guildCreate.js";
import { registerInteractionCreateEvent } from "./events/interactionCreate.js";

const env = loadEnv();
if (!env.DISCORD_BOT_TOKEN) {
  throw new Error("DISCORD_BOT_TOKEN is required to start the bot.");
}

const client = new BotClient({ intents: [GatewayIntentBits.Guilds] });

for (const command of [configCommand, personnageCommand]) {
  client.commands.set(command.data.name, command);
}
client.modalHandlers.push(personnageCreateModalHandler);
client.buttonHandlers.push(personnageDeleteConfirmHandler);

registerReadyEvent(client);
registerGuildCreateEvent(client);
registerInteractionCreateEvent(client);

client.login(env.DISCORD_BOT_TOKEN);
