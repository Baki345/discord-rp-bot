import type { CSSProperties } from "react";
import { getMusicConfig } from "@discord-rp/core";
import { saveMusicConfigAction } from "./actions";

export default async function MusicPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const config = await getMusicConfig(guildId);

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Musique</h1>
      <p style={{ color: "#a79ec2" }}>
        Écoute de musique en vocal via <code>/musique</code> (liens directs, SoundCloud, Bandcamp, Twitch, Vimeo). Le
        rôle DJ (optionnel) contrôle qui peut mettre en pause/passer/arrêter/changer le volume — ajouter une piste
        à la file reste ouvert à tout le monde.
      </p>

      <form action={saveMusicConfigAction.bind(null, guildId)} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24, maxWidth: 480 }}>
        <label style={checkboxLabelStyle}>
          <input type="checkbox" name="enabled" defaultChecked={config.enabled} />
          Activer la musique sur ce serveur
        </label>

        <label style={labelStyle}>
          Rôle DJ (ID, vide = tout le monde peut contrôler la lecture)
          <input name="djRoleId" defaultValue={config.djRoleId ?? ""} placeholder="ID de rôle" style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Salons vocaux autorisés (IDs séparés par une virgule, vide = tous)
          <input name="allowedVoiceChannelIds" defaultValue={config.allowedVoiceChannelIds.join(", ")} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Salons textuels autorisés pour les commandes (IDs séparés par une virgule, vide = tous)
          <input name="allowedTextChannelIds" defaultValue={config.allowedTextChannelIds.join(", ")} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Volume par défaut (0-150)
          <input name="defaultVolume" type="number" min={0} max={150} defaultValue={config.defaultVolume} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Taille max de la file d&apos;attente
          <input name="maxQueueSize" type="number" min={1} max={500} defaultValue={config.maxQueueSize} style={inputStyle} />
        </label>

        <button type="submit" style={buttonStyle}>
          Enregistrer
        </button>
      </form>
    </div>
  );
}

const labelStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, color: "#f4f2fa", fontSize: "0.85rem" };
const checkboxLabelStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 8, color: "#f4f2fa", fontSize: "0.9rem" };
const inputStyle: CSSProperties = { background: "#171225", border: "1px solid #2a2340", borderRadius: 6, padding: "8px 10px", color: "#f4f2fa" };
const buttonStyle: CSSProperties = {
  background: "#7c3aed",
  border: "none",
  borderRadius: 6,
  padding: "10px 16px",
  color: "white",
  cursor: "pointer",
  alignSelf: "flex-start",
};
