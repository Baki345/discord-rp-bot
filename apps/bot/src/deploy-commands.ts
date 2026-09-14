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
import { inventaireCommand } from "./commands/inventaire/index.js";
import { lieuCommand } from "./commands/lieu/index.js";
import { cleCommand } from "./commands/cle/index.js";
import { activiteCommand } from "./commands/activite/index.js";
import { craftCommand } from "./commands/craft/index.js";
import { permisCommand } from "./commands/permis/index.js";
import { sessionCommand } from "./commands/session/index.js";
import { serviceCommand } from "./commands/service/index.js";
import { braquageCommand } from "./commands/braquage/index.js";
import { drogueCommand } from "./commands/drogue/index.js";
import { racketCommand } from "./commands/racket/index.js";
import { blanchimentCommand } from "./commands/blanchiment/index.js";
import { bourseCommand } from "./commands/bourse/index.js";
import { modCommand } from "./commands/mod/index.js";
import { banContextMenu, kickContextMenu, timeoutContextMenu } from "./commands/mod/contextMenus.js";
import { securiteCommand } from "./commands/securite/index.js";
import { rescueCommand } from "./commands/rescue/index.js";
import { lockdownCommand } from "./commands/lockdown/index.js";
import { appelCommand } from "./commands/appel/index.js";
import { mesSanctionsCommand } from "./commands/mesSanctions/index.js";
import { ticketCommand } from "./commands/ticket/index.js";
import { candidatureCommand } from "./commands/candidature/index.js";
import { candidaturesCommand } from "./commands/candidatures/index.js";
import { niveauCommand } from "./commands/niveau/index.js";
import { classementCommand } from "./commands/classement/index.js";
import { interactionCommand } from "./commands/interaction/index.js";
import { messageCommand } from "./commands/message/index.js";

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
  inventaireCommand,
  lieuCommand,
  cleCommand,
  activiteCommand,
  craftCommand,
  permisCommand,
  sessionCommand,
  serviceCommand,
  braquageCommand,
  drogueCommand,
  racketCommand,
  blanchimentCommand,
  bourseCommand,
  modCommand,
  securiteCommand,
  rescueCommand,
  lockdownCommand,
  appelCommand,
  mesSanctionsCommand,
  ticketCommand,
  candidatureCommand,
  candidaturesCommand,
  niveauCommand,
  classementCommand,
  interactionCommand,
  messageCommand,
].map((c) => c.data.toJSON());
const contextMenuCommands = [banContextMenu, kickContextMenu, timeoutContextMenu].map((c) => c.data.toJSON());
const allCommands = [...commands, ...contextMenuCommands];
const rest = new REST().setToken(env.DISCORD_BOT_TOKEN);

async function main() {
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID!, guildId), { body: allCommands });
    console.log(`✅ ${allCommands.length} commande(s) enregistrée(s) sur le serveur ${guildId} (propagation immédiate).`);
  } else {
    await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID!), { body: allCommands });
    console.log(`✅ ${allCommands.length} commande(s) enregistrée(s) globalement (propagation jusqu'à 1h).`);
  }
}

main().catch((e) => {
  console.error("Échec de l'enregistrement des commandes :", e);
  process.exit(1);
});
