import { AttachmentBuilder, type ChatInputCommandInteraction } from "discord.js";
import QRCode from "qrcode";
import { generateRescueKey } from "@discord-rp/core";
import { resolveActorContext } from "../../context/resolveActorContext.js";

export async function executeCleSecoursGenerer(interaction: ChatInputCommandInteraction) {
  const actor = await resolveActorContext(interaction);
  const secret = await generateRescueKey(actor, { guildId: actor.guildId });

  const qrPng = await QRCode.toBuffer(secret, { errorCorrectionLevel: "M", margin: 2, width: 400 });
  const attachment = new AttachmentBuilder(qrPng, { name: "cle-secours.png" });

  await interaction.reply({
    content:
      `🔑 **Clé de secours générée** — à garder en lieu sûr, elle ne sera plus jamais affichée.\n` +
      `\`\`\`${secret}\`\`\`\n` +
      `Utilise \`/rescue\` avec cette clé (ou scanne le QR) si tu perds l'accès à ce compte propriétaire — elle te redonnera le statut extra owner. Elle est **à usage unique** : en générer une nouvelle invalide l'ancienne.`,
    files: [attachment],
    ephemeral: true,
  });
}
