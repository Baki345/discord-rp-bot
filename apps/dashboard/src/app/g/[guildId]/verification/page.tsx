import type { CSSProperties } from "react";
import { prisma } from "@discord-rp/database";
import { VerificationConfig } from "@discord-rp/core";
import { updateSuccessMessageAction } from "./actions";

const METHOD_LABELS: Record<string, string> = {
  BUTTON: "Bouton",
  MODAL: "Modal (texte à confirmer)",
  GRID_CAPTCHA: "Grille (captcha sans image)",
  WEB: "Web (dashboard)",
  INSTANT: "Instantané",
};

export default async function VerificationPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const [guildConfig, recentAttempts] = await Promise.all([
    prisma.guildConfig.findUnique({ where: { guildId } }),
    prisma.verificationAttempt.findMany({ where: { guildId }, orderBy: { completedAt: "desc" }, take: 20 }),
  ]);
  const parsed = VerificationConfig.safeParse(guildConfig?.verificationConfig ?? {});
  const config = parsed.success ? parsed.data : VerificationConfig.parse({});

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem" }}>Vérification</h1>
      <p style={{ color: "#a79ec2" }}>
        Configurée depuis Discord via <code>/securite verification setup</code>. Panneau posté avec{" "}
        <code>/securite verification panneau</code>.
      </p>

      <div style={cardStyle}>
        <div>État : <strong>{config.enabled ? "activée" : "désactivée"}</strong></div>
        <div>Mode : <strong>{METHOD_LABELS[config.method] ?? config.method}</strong></div>
        <div>Cible : <strong>{config.target === "ALL" ? "tout le monde" : "comptes suspects seulement"}</strong></div>
        <div>Rôle vérifié : <strong>{config.verifiedRoleId ? `#${config.verifiedRoleId}` : "non configuré"}</strong></div>
        <div>Action en cas d&apos;échec : <strong>{config.failAction}</strong></div>
        <div>Délai : <strong>{config.timeoutMinutes} min</strong></div>
      </div>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Message de succès</h2>
      <p style={{ color: "#a79ec2" }}>Affiché au membre une fois sa vérification réussie.</p>
      <form action={updateSuccessMessageAction.bind(null, guildId)} style={{ display: "flex", gap: 8, marginTop: 12, maxWidth: 480 }}>
        <input name="successMessage" defaultValue={config.successMessage} style={{ ...inputStyle, flex: 1 }} />
        <button type="submit" style={buttonStyle}>
          Enregistrer
        </button>
      </form>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Tentatives web récentes</h2>
      {recentAttempts.length === 0 ? (
        <p style={{ color: "#a79ec2" }}>Aucune tentative pour l&apos;instant.</p>
      ) : (
        <ul>
          {recentAttempts.map((a) => (
            <li key={a.id} style={{ color: "#a79ec2", fontSize: "0.9rem" }}>
              <span style={{ fontFamily: "monospace", color: "#f4f2fa" }}>{a.discordUserId}</span> — {a.method} —{" "}
              {a.completedAt.toLocaleString("fr-FR")} {a.processedAt ? "(traité)" : "(en attente)"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const inputStyle: CSSProperties = { background: "#171225", border: "1px solid #2a2340", borderRadius: 6, padding: "8px 10px", color: "#f4f2fa" };
const buttonStyle: CSSProperties = { background: "#7c3aed", border: "none", borderRadius: 6, padding: "8px 16px", color: "white", cursor: "pointer" };

const cardStyle = {
  background: "#171225",
  border: "1px solid #2a2340",
  borderRadius: 12,
  padding: "16px 20px",
  marginTop: 20,
  display: "flex",
  flexDirection: "column" as const,
  gap: 6,
  color: "#a79ec2",
  maxWidth: 420,
};
