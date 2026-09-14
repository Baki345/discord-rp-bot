import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@discord-rp/database";
import { updateGuildConfigAction } from "./actions";

export default async function SettingsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const [guild, config] = await Promise.all([
    prisma.guild.findUnique({ where: { id: guildId }, include: { plan: true } }),
    prisma.guildConfig.findUnique({ where: { guildId } }),
  ]);
  if (!guild || !config) notFound();

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Paramètres</h1>
      <p style={{ color: "#a79ec2" }}>
        Plan actuel : <strong>{guild.plan.name}</strong>
      </p>

      <form
        action={updateGuildConfigAction.bind(null, guildId)}
        style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 24, maxWidth: 420 }}
      >
        <label style={labelStyle}>
          Argent de départ des nouveaux personnages
          <input
            type="number"
            name="startingCash"
            step="0.01"
            min="0"
            defaultValue={(config.startingCashCents / 100).toFixed(2)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Limite de personnages par serveur (optionnel — plafonnée au max du plan)
          <input
            type="number"
            name="maxCharactersOverride"
            min="1"
            defaultValue={config.maxCharactersOverride ?? ""}
            placeholder={`Max du plan : ${guild.plan.maxCharactersPerGuild}`}
            style={inputStyle}
          />
        </label>

        <label style={checkboxLabelStyle}>
          <input type="checkbox" name="hungerThirstEnabled" defaultChecked={config.hungerThirstEnabled} />
          Activer la faim et la soif (décroissance automatique, objets consommables pour les restaurer)
        </label>

        <label style={checkboxLabelStyle}>
          <input type="checkbox" name="requireActiveSession" defaultChecked={config.requireActiveSession} />
          Exiger une session RP active pour l&apos;économie et les métiers (staff : /session start|stop)
        </label>

        <button type="submit" style={buttonStyle}>
          Enregistrer
        </button>
      </form>
    </div>
  );
}

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  color: "#f4f2fa",
  fontSize: "0.9rem",
};

const inputStyle: CSSProperties = {
  background: "#171225",
  border: "1px solid #2a2340",
  borderRadius: 6,
  padding: "8px 10px",
  color: "#f4f2fa",
};

const checkboxLabelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#f4f2fa",
  fontSize: "0.9rem",
};

const buttonStyle: CSSProperties = {
  background: "#7c3aed",
  border: "none",
  borderRadius: 6,
  padding: "8px 16px",
  color: "white",
  cursor: "pointer",
  alignSelf: "flex-start",
};
