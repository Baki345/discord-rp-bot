import "dotenv/config";
import { REST, Routes } from "discord.js";
import { loadEnv } from "@discord-rp/config";
import { configCommand } from "./commands/config/index.js";
import { personnageCommand } from "./commands/personnage/index.js";
import { economieCommand } from "./commands/economie/index.js";
import { banqueCommand } from "./commands/banque/index.js";
import { metierCommand } from "./commands/metier/index.js";
import { entrepriseCommand } from "./commands/entreprise/index.js";
import { vehiculeCommand } from "./commands/vehicule/index.js";
import { boutiqueCommand } from "./commands/boutique/index.js";

const env = loadEnv();
if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_CLIENT_ID) {
  throw new Error("DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID are required to deploy commands.");
}

const guildArg = process.argv.find((arg) => arg.startsWith("--guild="));
const guildId = guildArg ? guildArg.split("=")[1] : env.DISCORD_DEV_GUILD_ID;

const commands = [
  configCommand,
  personnageCommand,
  economieCommand,
  banqueCommand,
  metierCommand,
  entrepriseCommand,
  vehiculeCommand,
  boutiqueCommand,
].map((c) => c.data.toJSON());
const rest = new REST().setToken(env.DISCORD_BOT_TOKEN);

async function main() {
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID!, guildId), { body: commands });
    console.log(`✅ ${commands.length} commande(s) enregistrée(s) sur le serveur ${guildId} (propagation immédiate).`);
  } else {
    await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID!), { body: commands });
    console.log(`✅ ${commands.length} commande(s) enregistrée(s) globalement (propagation jusqu'à 1h).`);
  }
}

main().catch((e) => {
  console.error("Échec de l'enregistrement des commandes :", e);
  process.exit(1);
});
