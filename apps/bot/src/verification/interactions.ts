import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { getVerificationConfig } from "@discord-rp/core";
import type { ButtonHandler, ModalHandler } from "../client.js";
import { sessionKey, generateGrid, startGridCaptcha, getGridCaptcha, consumeFailedAttempt } from "./gridCaptchaSessions.js";
import { applyFailAction, grantVerifiedRole } from "./actions.js";

const CONFIRM_PHRASE = "JE CONFIRME";

async function startChallenge(interaction: ButtonInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const config = await getVerificationConfig(guildId);
  if (!config.verifiedRoleId) {
    await interaction.reply({ content: "❌ La vérification n'est pas configurée (rôle manquant).", ephemeral: true });
    return;
  }

  const member = await interaction.guild!.members.fetch(interaction.user.id);

  switch (config.method) {
    case "INSTANT": {
      const ok = await grantVerifiedRole(member, config.verifiedRoleId);
      await interaction.reply({ content: ok ? "✅ Tu es vérifié·e !" : "❌ Échec de l'attribution du rôle.", ephemeral: true });
      return;
    }
    case "BUTTON": {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("verify:confirm").setLabel("Confirmer").setStyle(ButtonStyle.Success),
      );
      await interaction.reply({ content: "Clique pour confirmer ta vérification.", components: [row], ephemeral: true });
      return;
    }
    case "MODAL": {
      const modal = new ModalBuilder()
        .setCustomId("verify:modal")
        .setTitle("Vérification")
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("phrase")
              .setLabel(`Tape "${CONFIRM_PHRASE}"`)
              .setStyle(TextInputStyle.Short)
              .setRequired(true),
          ),
        );
      await interaction.showModal(modal);
      return;
    }
    case "GRID_CAPTCHA": {
      const { emojis, correctIndex } = generateGrid();
      startGridCaptcha(sessionKey(guildId, interaction.user.id), correctIndex);
      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      for (let r = 0; r < 3; r++) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        for (let c = 0; c < 3; c++) {
          const i = r * 3 + c;
          row.addComponents(new ButtonBuilder().setCustomId(`verify:grid:${i}`).setLabel(emojis[i]!).setStyle(ButtonStyle.Secondary));
        }
        rows.push(row);
      }
      await interaction.reply({ content: "Clique sur la case différente des autres.", components: rows, ephemeral: true });
      return;
    }
    case "WEB": {
      const domain = process.env.DASHBOARD_DOMAIN ? `https://${process.env.DASHBOARD_DOMAIN}` : "le dashboard";
      await interaction.reply({ content: `Vérifie-toi via ${domain}/verify/${guildId} (connexion Discord requise).`, ephemeral: true });
      return;
    }
  }
}

export const verifyStartHandler: ButtonHandler = { customIdPrefix: "verify:start", execute: startChallenge };

export const verifyConfirmHandler: ButtonHandler = {
  customIdPrefix: "verify:confirm",
  async execute(interaction: ButtonInteraction) {
    const config = await getVerificationConfig(interaction.guildId!);
    if (!config.verifiedRoleId) return;
    const member = await interaction.guild!.members.fetch(interaction.user.id);
    const ok = await grantVerifiedRole(member, config.verifiedRoleId);
    await interaction.reply({ content: ok ? "✅ Tu es vérifié·e !" : "❌ Échec de l'attribution du rôle.", ephemeral: true });
  },
};

export const verifyGridHandler: ButtonHandler = {
  customIdPrefix: "verify:grid:",
  async execute(interaction: ButtonInteraction) {
    const guildId = interaction.guildId!;
    const key = sessionKey(guildId, interaction.user.id);
    const session = getGridCaptcha(key);
    if (!session) {
      await interaction.reply({ content: "❌ Ce défi a expiré — relance `/verifier` (bouton) pour en obtenir un nouveau.", ephemeral: true });
      return;
    }

    const clickedIndex = Number(interaction.customId.slice("verify:grid:".length));
    if (clickedIndex === session.correctIndex) {
      const config = await getVerificationConfig(guildId);
      const member = await interaction.guild!.members.fetch(interaction.user.id);
      const ok = config.verifiedRoleId ? await grantVerifiedRole(member, config.verifiedRoleId) : false;
      await interaction.reply({ content: ok ? "✅ Tu es vérifié·e !" : "❌ Échec de l'attribution du rôle.", ephemeral: true });
      return;
    }

    const remaining = consumeFailedAttempt(key);
    if (remaining <= 0) {
      const member = await interaction.guild!.members.fetch(interaction.user.id);
      const config = await getVerificationConfig(guildId);
      await applyFailAction(member, config.failAction, "Échec du captcha de vérification");
      await interaction.reply({ content: "❌ Mauvaise case, plus de tentatives.", ephemeral: true });
      return;
    }

    await interaction.reply({ content: `❌ Mauvaise case — ${remaining} tentative(s) restante(s).`, ephemeral: true });
  },
};

export const verifyModalHandler: ModalHandler = {
  customIdPrefix: "verify:modal",
  async execute(interaction: ModalSubmitInteraction) {
    const phrase = interaction.fields.getTextInputValue("phrase").trim().toUpperCase();
    if (phrase !== CONFIRM_PHRASE) {
      await interaction.reply({ content: `❌ Tape exactement "${CONFIRM_PHRASE}".`, ephemeral: true });
      return;
    }
    const config = await getVerificationConfig(interaction.guildId!);
    if (!config.verifiedRoleId) {
      await interaction.reply({ content: "❌ La vérification n'est pas configurée (rôle manquant).", ephemeral: true });
      return;
    }
    const member = await interaction.guild!.members.fetch(interaction.user.id);
    const ok = await grantVerifiedRole(member, config.verifiedRoleId);
    await interaction.reply({ content: ok ? "✅ Tu es vérifié·e !" : "❌ Échec de l'attribution du rôle.", ephemeral: true });
  },
};
